import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    console.log('Verifying payment for session:', sessionId)

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Extract info from metadata
    const quizId = session.metadata?.quizId
    const quizTitle = session.metadata?.quizTitle
    const userEmail = session.metadata?.userEmail
    const userId = session.metadata?.userId // New: get user ID if available

    console.log('Session metadata:', {
      quizId,
      quizTitle,
      userEmail,
      userId
    })

    if (!quizId || !userEmail) {
      return NextResponse.json(
        { error: 'Quiz information not found in payment' },
        { status: 400 }
      )
    }

    // Check if purchase record already exists
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('stripe_payment_intent_id', session.payment_intent as string)
      .single()

    if (existingPurchase) {
      console.log('Purchase record already exists')
      return NextResponse.json({
        success: true,
        quizId,
        quizTitle,
        userEmail,
        amountPaid: session.amount_total ? session.amount_total / 100 : 0
      })
    }

    // Create purchase record in database
    const purchaseData = {
      user_email: userEmail,
      quiz_id: quizId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: session.amount_total || 0,
      status: 'completed',
      purchased_at: new Date().toISOString(),
      ...(userId && { user_id: userId }) // Add user_id if available
    }

    console.log('Creating purchase record:', purchaseData)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([purchaseData])
      .select()
      .single()

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError)
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 }
      )
    }

    console.log('Purchase recorded successfully:', purchase.id)

    // Create access token for backward compatibility (optional)
    const accessToken = `quiz_${quizId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year access

    const { error: tokenError } = await supabase
      .from('quiz_access_tokens')
      .insert([{
        user_email: userEmail,
        quiz_id: quizId,
        token: accessToken,
        expires_at: expiresAt.toISOString()
      }])

    if (tokenError) {
      console.error('Error creating access token:', tokenError)
      // Don't fail the request for this
    }

    return NextResponse.json({
      success: true,
      quizId,
      quizTitle,
      userEmail,
      amountPaid: session.amount_total ? session.amount_total / 100 : 0,
      purchaseId: purchase.id,
      accessToken
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

// Also handle POST requests for manual verification
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Redirect to GET handler
    const url = new URL('/api/verify-payment', request.url)
    url.searchParams.set('session_id', sessionId)
    
    const getRequest = new NextRequest(url)
    return await GET(getRequest)

  } catch (error) {
    console.error('POST payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}