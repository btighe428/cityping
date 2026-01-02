import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { sendSms } from '@/lib/twilio'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = verifyWebhookSignature(body, signature)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: 'stripe',
        eventId: event.id,
      },
    },
  })

  if (existingEvent?.processedAt) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Store event
  await prisma.webhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: 'stripe',
        eventId: event.id,
      },
    },
    update: {},
    create: {
      provider: 'stripe',
      eventId: event.id,
      payload: event as unknown as object,
    },
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider: 'stripe',
          eventId: event.id,
        },
      },
      data: { processedAt: new Date() },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const email = session.customer_details?.email || null

  // Get metadata from session or subscription
  let phoneE164 = session.metadata?.phone_e164
  let citySlugs = session.metadata?.city_slugs?.split(',') || ['nyc']

  // If not in session metadata, check subscription metadata
  if (!phoneE164 && subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    phoneE164 = subscription.metadata?.phone_e164
    citySlugs = subscription.metadata?.city_slugs?.split(',') || citySlugs
  }

  if (!phoneE164) {
    console.error('No phone number in checkout session metadata')
    return
  }

  // Get or create account
  let account = await prisma.account.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!account) {
    account = await prisma.account.create({
      data: {
        stripeCustomerId: customerId,
        email,
      },
    })
  } else if (email && !account.email) {
    await prisma.account.update({
      where: { id: account.id },
      data: { email },
    })
  }

  // Check if phone already exists for different account
  const existingPhone = await prisma.phone.findUnique({
    where: { e164: phoneE164 },
    include: { account: true },
  })

  if (existingPhone && existingPhone.accountId !== account.id) {
    console.error('Phone number already associated with different account')
    // For MVP, we'll block this case
    return
  }

  // Create or update phone
  const phone = await prisma.phone.upsert({
    where: { e164: phoneE164 },
    update: {
      accountId: account.id,
    },
    create: {
      accountId: account.id,
      e164: phoneE164,
      smsOptInStatus: 'pending',
    },
  })

  // Get subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Create or update subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    update: {
      status: stripeSubscription.status,
      currentPeriodEnd: new Date((stripeSubscription as unknown as { current_period_end: number }).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      priceId: stripeSubscription.items.data[0]?.price.id || '',
    },
    create: {
      accountId: account.id,
      stripeSubscriptionId: subscriptionId,
      status: stripeSubscription.status,
      currentPeriodEnd: new Date((stripeSubscription as unknown as { current_period_end: number }).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      priceId: stripeSubscription.items.data[0]?.price.id || '',
    },
  })

  // Set up city alerts
  for (const slug of citySlugs) {
    const city = await prisma.city.findUnique({ where: { slug } })
    if (city) {
      await prisma.phoneCityAlert.upsert({
        where: {
          phoneId_cityId: {
            phoneId: phone.id,
            cityId: city.id,
          },
        },
        update: { enabled: true },
        create: {
          phoneId: phone.id,
          cityId: city.id,
          enabled: true,
        },
      })
    }
  }

  // Send opt-in SMS if not already sent recently
  const recentOptIn = await prisma.messageOutbox.findFirst({
    where: {
      phoneId: phone.id,
      type: 'opt_in',
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Within last hour
    },
  })

  if (!recentOptIn) {
    const message = SMS_TEMPLATES.optIn()

    // Create message record
    const outbox = await prisma.messageOutbox.create({
      data: {
        phoneId: phone.id,
        type: 'opt_in',
        body: message,
        status: 'queued',
      },
    })

    // Send SMS
    try {
      const result = await sendSms(phoneE164, message)
      if (result) {
        await prisma.messageOutbox.update({
          where: { id: outbox.id },
          data: {
            twilioMessageSid: result.sid,
            status: 'sent',
          },
        })
      }
    } catch (error) {
      console.error('Failed to send opt-in SMS:', error)
      await prisma.messageOutbox.update({
        where: { id: outbox.id },
        data: {
          status: 'failed',
          errorCode: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = subscription as unknown as { id: string; status: string; current_period_end: number; cancel_at_period_end: boolean }
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
    },
  })
}
