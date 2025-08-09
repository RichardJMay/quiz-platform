import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

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

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Extract quiz info from metadata
    const quizId = session.metadata?.quizId
    const quizTitle = session.metadata?.quizTitle
    const userEmail = session.metadata?.userEmail

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz information not found' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      quizId,
      quizTitle,
      userEmail,
      amountPaid: session.amount_total ? session.amount_total / 100 : 0
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}