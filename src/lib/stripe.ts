import { loadStripe } from '@stripe/stripe-js'
import Stripe from 'stripe'

// Check for required environment variables
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const secretKey = process.env.STRIPE_SECRET_KEY

if (!publishableKey) {
  console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
}

if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY environment variable')
}

// Client-side Stripe
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null

// Server-side Stripe
export const stripe = secretKey ? new Stripe(secretKey, {
  apiVersion: '2025-07-30.basil',
}) : null