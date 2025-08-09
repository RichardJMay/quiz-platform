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
    
    const { quizId, userEmail } = body

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

    console.log('Creating Stripe session for quiz:', quiz.title, 'Price:', quiz.price)

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
      metadata: {
        quizId: quiz.id,
        userEmail: userEmail,
        quizTitle: quiz.title,
      },
      success_url: `${request.nextUrl.origin}/quiz-access?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?cancelled=true`,
    })

    console.log('Stripe session created successfully:', session.id)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}