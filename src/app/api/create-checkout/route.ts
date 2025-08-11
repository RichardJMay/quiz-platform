import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('=== Checkout API called ===')
  
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.log('ERROR: Stripe not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { quizId, userEmail, userId } = body

    // Validate input
    if (!quizId || !userEmail) {
      console.log('ERROR: Missing quizId or userEmail')
      return NextResponse.json(
        { error: 'Quiz ID and email are required' },
        { status: 400 }
      )
    }

    console.log('Fetching quiz from database:', quizId)
    
    // Get quiz details from database
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free')
      .eq('id', quizId)
      .single()

    console.log('Database response:', { quiz, error })

    if (error || !quiz) {
      console.log('ERROR: Quiz not found or database error:', error)
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    if (quiz.is_free) {
      console.log('ERROR: Quiz is free')
      return NextResponse.json(
        { error: 'This quiz is free' },
        { status: 400 }
      )
    }

    // Check if user already owns this quiz (for authenticated users)
    if (userId) {
      console.log('Checking if authenticated user already owns quiz:', userId)
      
      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .eq('status', 'completed')
        .single()

      if (existingPurchase) {
        console.log('User already owns this quiz')
        return NextResponse.json(
          { error: 'You already own this quiz. Check your dashboard to access it.' },
          { status: 400 }
        )
      }
    } else {
      // Check for guest purchases by email
      console.log('Checking if guest email already purchased quiz:', userEmail)
      
      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_email', userEmail)
        .eq('quiz_id', quizId)
        .eq('status', 'completed')
        .single()

      if (existingPurchase) {
        console.log('Email already purchased this quiz')
        return NextResponse.json(
          { error: 'This email has already purchased this quiz.' },
          { status: 400 }
        )
      }
    }

    console.log('Creating Stripe session for quiz:', quiz.title, 'Price:', quiz.price)

    // Create enhanced metadata for linking purchases
    const metadata: { [key: string]: string } = {
      quizId: quiz.id,
      userEmail: userEmail,
      quizTitle: quiz.title,
    }

    // Add userId to metadata if user is authenticated
    if (userId) {
      metadata.userId = userId
      console.log('Adding userId to metadata:', userId)
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: quiz.title,
              description: quiz.description || `Access to quiz: ${quiz.title}`,
            },
            unit_amount: Math.round(quiz.price * 100), // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail,
      metadata,
      success_url: `${request.nextUrl.origin}/quiz-access?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?cancelled=true`,
    })

    console.log('Stripe session created successfully:', session.id)
    console.log('Session metadata:', metadata)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}