import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { quizId, userEmail } = await request.json()

    // Validate input
    if (!quizId || !userEmail) {
      return NextResponse.json(
        { error: 'Quiz ID and email are required' },
        { status: 400 }
      )
    }

    // Get quiz details from database
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free')
      .eq('id', quizId)
      .single()

    if (error || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    if (quiz.is_free) {
      return NextResponse.json(
        { error: 'This quiz is free' },
        { status: 400 }
      )
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
      metadata: {
        quizId: quiz.id,
        userEmail: userEmail,
        quizTitle: quiz.title,
      },
      success_url: `${request.nextUrl.origin}/quiz-access?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?cancelled=true`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}