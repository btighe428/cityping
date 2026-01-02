import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
})

export async function createCheckoutSession({
  phone,
  email,
  citySlugs,
  successUrl,
  cancelUrl,
}: {
  phone?: string
  email?: string
  citySlugs: string[]
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID_MONTHLY is not set')
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email, // Pre-fill email in Stripe Checkout
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        phone_e164: phone || '',
        email: email || '',
        city_slugs: citySlugs.join(','),
      },
    },
    metadata: {
      phone_e164: phone || '',
      email: email || '',
      city_slugs: citySlugs.join(','),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
