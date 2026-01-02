import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateManageToken, markTokenUsed } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, citySettings, preferredSendTimeLocal } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate token
    const validation = await validateManageToken(token)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 })
    }

    const { phoneId, tokenId } = validation

    // Update city settings
    if (citySettings && Array.isArray(citySettings)) {
      for (const setting of citySettings) {
        const { slug, enabled } = setting
        const city = await prisma.city.findUnique({ where: { slug } })

        if (city) {
          await prisma.phoneCityAlert.upsert({
            where: {
              phoneId_cityId: {
                phoneId: phoneId!,
                cityId: city.id,
              },
            },
            update: {
              enabled,
              preferredSendTimeLocal: preferredSendTimeLocal || null,
            },
            create: {
              phoneId: phoneId!,
              cityId: city.id,
              enabled,
              preferredSendTimeLocal: preferredSendTimeLocal || null,
            },
          })
        }
      }
    }

    // Mark token as used
    await markTokenUsed(tokenId!)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Manage update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
