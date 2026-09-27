import { NextResponse } from 'next/server'

// Individual-pack checkout is retired. Future account subscriptions need a new,
// server-verified flow; do not reactivate this legacy route.
export async function POST() {
  return NextResponse.json(
    { error: 'Individual pack purchases are unavailable.' },
    { status: 410 },
  )
}
