# ParkPing

SMS-based alternate side parking (ASP) suspension alerts for NYC drivers.

## Overview

ParkPing sends you a text message the evening before ASP is suspended (holidays, etc.), so you don't have to move your car. Simple, reliable, $1.99/month after a 30-day free trial.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Payments:** Stripe (Checkout + Customer Portal)
- **SMS:** Twilio (Messaging Service)
- **Dates:** Luxon
- **Calendar:** node-ical for ICS parsing
- **Deployment:** Vercel + Vercel Cron

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Supabase)
- Stripe account (test mode for development)
- Twilio account (test credentials for development)

### 1. Clone and Install

```bash
cd parkping
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/parkping"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_MESSAGING_SERVICE_SID="MG..."

# App
APP_BASE_URL="http://localhost:3000"
CRON_SECRET="your-secure-random-string"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or create migration (production)
npm run db:migrate

# Seed with NYC city and sample events
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
parkping/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/            # Post-checkout dashboard
│   │   ├── m/[token]/            # Manage page via SMS link
│   │   ├── terms/                # Terms of service
│   │   ├── privacy/              # Privacy policy
│   │   └── api/
│   │       ├── checkout/create/  # Stripe Checkout
│   │       ├── webhooks/
│   │       │   ├── stripe/       # Stripe webhooks
│   │       │   └── twilio/       # Twilio inbound SMS
│   │       ├── manage/update/    # Update preferences
│   │       ├── stripe/portal/    # Stripe Customer Portal
│   │       └── jobs/             # Cron endpoints
│   │           ├── refresh-calendars/
│   │           ├── send-reminders/
│   │           └── send-monthly-recap/
│   ├── components/               # React components
│   └── lib/                      # Utilities
│       ├── db.ts                 # Prisma client
│       ├── stripe.ts             # Stripe helpers
│       ├── twilio.ts             # Twilio helpers
│       ├── ics.ts                # ICS parsing
│       ├── tokens.ts             # Manage token generation
│       └── sms-templates.ts      # Message templates
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed script
├── __tests__/                    # Jest tests
└── vercel.json                   # Cron configuration
```

## Webhook Setup

### Stripe Webhooks

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret to `.env`

Events to enable in production:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Twilio Webhooks

1. Use ngrok for local testing: `ngrok http 3000`
2. In Twilio Console, set your Messaging Service webhook to:
   `https://your-ngrok-url.ngrok.io/api/webhooks/twilio/inbound`

## Cron Jobs

Jobs run via Vercel Cron (configured in `vercel.json`):

| Job | Schedule (UTC) | Description |
|-----|----------------|-------------|
| refresh-calendars | 7:00 AM (2 AM ET) | Fetch/parse ICS calendar |
| send-reminders | 11:00 PM (6 PM ET) | Send suspension alerts |
| send-monthly-recap | 3:00 PM 1st (10 AM ET) | Monthly summary |

Jobs require `Authorization: Bearer ${CRON_SECRET}` header.

### Manual Testing

```bash
# Test calendar refresh
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/jobs/refresh-calendars

# Test reminder send
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/jobs/send-reminders
```

## SMS Keywords

Users can text these keywords:

| Keyword | Action |
|---------|--------|
| YES | Confirm opt-in (start receiving alerts) |
| STOP | Unsubscribe from all messages |
| START | Re-subscribe (if subscription active) |
| HELP | Get help message |
| MANAGE | Receive settings link via SMS |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Deployment

### Vercel

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Database

For production, use:
- Supabase PostgreSQL
- Neon
- Railway
- Any PostgreSQL provider

### Post-Deployment

1. Set up Stripe webhook endpoint pointing to production URL
2. Set up Twilio webhook endpoint pointing to production URL
3. Create Stripe product/price for $1.99/month with 30-day trial
4. Run seed script or manually create NYC city + calendar source

## Stripe Setup

1. Create a product in Stripe Dashboard
2. Create a price: $1.99/month recurring
3. Copy the price ID to `STRIPE_PRICE_ID_MONTHLY`
4. Enable Customer Portal in Stripe settings

## Architecture Notes

### Idempotency

- Stripe webhooks: Stored in `webhook_events` table, skipped if already processed
- Reminders: Unique constraint on `(phone_id, city_id, type, target_date)` prevents duplicates

### Double Opt-In

1. User enters phone at checkout
2. After payment, SMS sent: "Reply YES to confirm"
3. Only after YES reply do alerts begin
4. Required for TCPA compliance

### Multi-City Ready

Schema supports multiple cities, but MVP only seeds NYC. To add cities:
1. Add city record with timezone
2. Add calendar source with ICS URL
3. Cities automatically appear in UI

## License

Proprietary - All rights reserved
