import { NextResponse } from 'next/server'
import { fetchASPStatus } from '@/lib/nyc-asp-status'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const status = await fetchASPStatus()

    if (!status) {
      return NextResponse.json(
        { error: 'Could not fetch ASP status' },
        { status: 503 }
      )
    }

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('ASP status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ASP status' },
      { status: 500 }
    )
  }
}
