/**
 * Test utilities for verifying idempotency and job locking
 */

import { sendEmailTracked, acquireJobLock, wasEmailSent } from '../src/lib/email-outbox'
import { prisma } from '../src/lib/db'

// Mock the dependencies
jest.mock('../src/lib/db', () => ({
  prisma: {
    emailOutbox: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    jobLock: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('../src/lib/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
}))

describe('email-outbox', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendEmailTracked', () => {
    it('should create outbox record and send email', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ id: 'test-id' })
      const mockUpdate = jest.fn().mockResolvedValue({})
      
      ;(prisma.emailOutbox.create as jest.Mock) = mockCreate
      ;(prisma.emailOutbox.update as jest.Mock) = mockUpdate

      const result = await sendEmailTracked(
        {
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
        'daily_digest',
        new Date('2026-01-31')
      )

      expect(result.success).toBe(true)
      expect(mockCreate).toHaveBeenCalled()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'sent' }),
        })
      )
    })

    it('should detect duplicates and skip sending', async () => {
      const duplicateError = new Error('Unique constraint violation')
      ;(duplicateError as { code?: string }).code = 'P2002'
      
      ;(prisma.emailOutbox.create as jest.Mock) = jest.fn().mockRejectedValue(duplicateError)
      ;(prisma.emailOutbox.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        status: 'sent',
        id: 'existing-id',
      })

      const result = await sendEmailTracked(
        {
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
        'daily_digest',
        new Date('2026-01-31')
      )

      expect(result.alreadySent).toBe(true)
    })
  })

  describe('acquireJobLock', () => {
    it('should acquire lock when available', async () => {
      ;(prisma.jobLock.create as jest.Mock) = jest.fn().mockResolvedValue({})

      const lockId = await acquireJobLock('test-job', 30)

      expect(lockId).toBeTruthy()
      expect(prisma.jobLock.create).toHaveBeenCalled()
    })

    it('should return null when lock is held', async () => {
      const duplicateError = new Error('Unique constraint violation')
      ;(duplicateError as { code?: string }).code = 'P2002'
      
      ;(prisma.jobLock.create as jest.Mock) = jest.fn().mockRejectedValue(duplicateError)
      ;(prisma.jobLock.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        lockId: 'other-lock',
        expiresAt: new Date(Date.now() + 60000), // Not expired
      })

      const lockId = await acquireJobLock('test-job', 30)

      expect(lockId).toBeNull()
    })
  })

  describe('wasEmailSent', () => {
    it('should return true if email was sent', async () => {
      ;(prisma.emailOutbox.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        status: 'sent',
      })

      const result = await wasEmailSent('test@example.com', 'daily_digest', new Date())

      expect(result).toBe(true)
    })

    it('should return false if email was not sent', async () => {
      ;(prisma.emailOutbox.findUnique as jest.Mock) = jest.fn().mockResolvedValue(null)

      const result = await wasEmailSent('test@example.com', 'daily_digest', new Date())

      expect(result).toBe(false)
    })
  })
})
