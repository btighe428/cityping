// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
process.env.STRIPE_PRICE_ID_MONTHLY = 'price_mock'
process.env.STRIPE_PREMIUM_PRICE_ID = 'price_premium_test'
process.env.TWILIO_ACCOUNT_SID = 'AC_mock'
process.env.TWILIO_AUTH_TOKEN = 'mock_token'
process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG_mock'
process.env.APP_BASE_URL = 'http://localhost:3000'
process.env.CRON_SECRET = 'test_cron_secret'

// Mock Prisma client
jest.mock('../src/lib/db', () => ({
  prisma: {
    manageToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))
