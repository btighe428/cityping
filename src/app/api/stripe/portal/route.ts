import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createPortalSession } from '@/lib/stripe'
import { validateManageToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate token (don't mark as used - allow multiple portal visits)
    const validation = await validateManageToken(token)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 })
    }

    // Get phone and account
    const phone = await prisma.phone.findUnique({
      where: { id: validation.phoneId },
      include: { account: true },
    })

    if (!phone?.account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/m/${token}`

    const portalSession = await createPortalSession(
      phone.account.stripeCustomerId,
      returnUrl
    )

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
