import { NextResponse } from 'next/server'

// This legacy purchase callback must not grant access or write purchase records.
// A future subscription flow will use a separate verified webhook.
const unavailable = () => NextResponse.json(
  { error: 'Individual pack purchases are unavailable.' },
  { status: 410 },
)

export async function GET() { return unavailable() }
export async function POST() { return unavailable() }
