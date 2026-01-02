import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSms, normalizeKeyword, isStopKeyword, isStartKeyword, isHelpKeyword } from '@/lib/twilio'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import { createManageToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from = formData.get('From') as string
  const body = formData.get('Body') as string

  if (!from || !body) {
    return NextResponse.json({ error: 'Missing From or Body' }, { status: 400 })
  }

  // Find phone by e164
  const phone = await prisma.phone.findUnique({
    where: { e164: from },
    include: {
      account: {
        include: {
          subscriptions: {
            where: {
              status: { in: ['active', 'trialing'] },
            },
          },
        },
      },
    },
  })

  if (!phone) {
    // Unknown number - don't respond to avoid spam
    return NextResponse.json({ received: true })
  }

  const keyword = normalizeKeyword(body)
  const hasActiveSubscription = phone.account.subscriptions.length > 0

  let responseMessage: string | null = null

  // Handle keywords
  if (keyword === 'YES') {
    if (phone.smsOptInStatus === 'pending') {
      // Confirm opt-in
      await prisma.phone.update({
        where: { id: phone.id },
        data: {
          smsOptInStatus: 'confirmed',
          smsOptInAt: new Date(),
          smsOptInSource: 'sms_yes_reply',
        },
      })
      responseMessage = SMS_TEMPLATES.confirmed()
    } else if (phone.smsOptInStatus === 'confirmed') {
      responseMessage = SMS_TEMPLATES.alreadyConfirmed()
    } else if (phone.smsOptInStatus === 'revoked') {
      if (hasActiveSubscription) {
        // Re-enable
        await prisma.phone.update({
          where: { id: phone.id },
          data: {
            smsOptInStatus: 'confirmed',
            smsOptInAt: new Date(),
            smsOptInSource: 'sms_yes_reply',
          },
        })
        responseMessage = SMS_TEMPLATES.restarted()
      } else {
        responseMessage = SMS_TEMPLATES.subscriptionRequired()
      }
    }
  } else if (isStopKeyword(keyword)) {
    // Revoke opt-in
    await prisma.phone.update({
      where: { id: phone.id },
      data: {
        smsOptInStatus: 'revoked',
      },
    })
    responseMessage = SMS_TEMPLATES.stopped()
  } else if (isStartKeyword(keyword)) {
    if (hasActiveSubscription) {
      await prisma.phone.update({
        where: { id: phone.id },
        data: {
          smsOptInStatus: 'confirmed',
          smsOptInAt: new Date(),
          smsOptInSource: 'sms_start_reply',
        },
      })
      responseMessage = SMS_TEMPLATES.restarted()
    } else {
      responseMessage = SMS_TEMPLATES.noSubscription()
    }
  } else if (isHelpKeyword(keyword)) {
    responseMessage = SMS_TEMPLATES.help()
  } else if (keyword === 'MANAGE') {
    if (hasActiveSubscription) {
      const token = await createManageToken(phone.id)
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      const manageUrl = `${baseUrl}/m/${token}`
      responseMessage = SMS_TEMPLATES.manageLink(manageUrl)
    } else {
      responseMessage = SMS_TEMPLATES.noSubscription()
    }
  }

  // Send response if we have one
  if (responseMessage) {
    // Log the message
    await prisma.messageOutbox.create({
      data: {
        phoneId: phone.id,
        type: 'system',
        body: responseMessage,
        status: 'queued',
      },
    })

    try {
      await sendSms(from, responseMessage)
    } catch (error) {
      console.error('Failed to send response SMS:', error)
    }
  }

  return NextResponse.json({ received: true })
}
