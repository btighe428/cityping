/**
 * Frequency Cap Tracking
 * 
 * Tracks how many messages each user has received in a given time period
 * and enforces limits to prevent message fatigue.
 */

import { prisma } from './db'
import { FREQUENCY_CAPS, MESSAGE_PRIORITY, getEmailPriority } from './delivery-config'

export interface FrequencyCheck {
  allowed: boolean
  reason?: string
  currentCount: number
  limit: number
}

export interface UserDeliveryStats {
  emailsToday: number
  smsToday: number
  lastEmailAt?: Date
  lastSmsAt?: Date
  recentTypes: string[]
}

/**
 * Get delivery statistics for a user
 */
export async function getUserDeliveryStats(
  userId: string,
  date: Date = new Date()
): Promise<UserDeliveryStats> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  // Get today's email deliveries
  const emailOutbox = await prisma.emailOutbox.findMany({
    where: {
      recipient: {
        in: await getUserEmails(userId),
      },
      sentAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'sent',
    },
    orderBy: { sentAt: 'desc' },
    select: {
      emailType: true,
      sentAt: true,
    },
  })
  
  // Get today's SMS deliveries (via MessageOutbox for legacy users)
  const smsOutbox = await prisma.messageOutbox.findMany({
    where: {
      phoneId: {
        in: await getUserPhoneIds(userId),
      },
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'sent',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      type: true,
      createdAt: true,
    },
  })
  
  return {
    emailsToday: emailOutbox.length,
    smsToday: smsOutbox.length,
    lastEmailAt: emailOutbox[0]?.sentAt ?? undefined,
    lastSmsAt: smsOutbox[0]?.createdAt ?? undefined,
    recentTypes: [
      ...emailOutbox.map(e => e.emailType),
      ...smsOutbox.map(s => s.type),
    ],
  }
}

/**
 * Check if sending an email would exceed frequency caps
 */
export async function checkEmailFrequencyCap(
  userId: string,
  emailType: string,
  date: Date = new Date()
): Promise<FrequencyCheck> {
  const stats = await getUserDeliveryStats(userId, date)
  const priority = getEmailPriority(emailType)
  
  // Critical and urgent messages bypass frequency caps
  if (priority >= MESSAGE_PRIORITY.URGENT) {
    return {
      allowed: true,
      currentCount: stats.emailsToday,
      limit: FREQUENCY_CAPS.EMAILS_PER_DAY,
    }
  }
  
  // Check if already at limit
  if (stats.emailsToday >= FREQUENCY_CAPS.EMAILS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily email limit reached (${stats.emailsToday}/${FREQUENCY_CAPS.EMAILS_PER_DAY})`,
      currentCount: stats.emailsToday,
      limit: FREQUENCY_CAPS.EMAILS_PER_DAY,
    }
  }
  
  // Check for duplicate type within cooldown period
  const hasRecentSameType = await hasRecentDeliveryOfType(userId, emailType, date)
  if (hasRecentSameType) {
    return {
      allowed: false,
      reason: `Similar email sent recently (cooldown active)`,
      currentCount: stats.emailsToday,
      limit: FREQUENCY_CAPS.EMAILS_PER_DAY,
    }
  }
  
  return {
    allowed: true,
    currentCount: stats.emailsToday,
    limit: FREQUENCY_CAPS.EMAILS_PER_DAY,
  }
}

/**
 * Check if sending an SMS would exceed frequency caps
 */
export async function checkSmsFrequencyCap(
  userId: string,
  messageType: string,
  date: Date = new Date()
): Promise<FrequencyCheck> {
  const stats = await getUserDeliveryStats(userId, date)
  const priority = getEmailPriority(messageType) // Reuse priority mapping
  
  // Critical messages bypass SMS caps
  if (priority >= MESSAGE_PRIORITY.CRITICAL) {
    return {
      allowed: true,
      currentCount: stats.smsToday,
      limit: FREQUENCY_CAPS.SMS_PER_DAY,
    }
  }
  
  if (stats.smsToday >= FREQUENCY_CAPS.SMS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily SMS limit reached (${stats.smsToday}/${FREQUENCY_CAPS.SMS_PER_DAY})`,
      currentCount: stats.smsToday,
      limit: FREQUENCY_CAPS.SMS_PER_DAY,
    }
  }
  
  return {
    allowed: true,
    currentCount: stats.smsToday,
    limit: FREQUENCY_CAPS.SMS_PER_DAY,
  }
}

/**
 * Check if user has received a delivery of this type recently
 */
async function hasRecentDeliveryOfType(
  userId: string,
  emailType: string,
  date: Date
): Promise<boolean> {
  const { FREQUENCY_CAPS } = await import('./delivery-config')
  const cooldownMs = FREQUENCY_CAPS.SAME_TYPE_COOLDOWN_HOURS * 60 * 60 * 1000
  const cutoff = new Date(date.getTime() - cooldownMs)
  
  const userEmails = await getUserEmails(userId)
  const emails = await prisma.emailOutbox.findFirst({
    where: {
      recipient: {
        in: userEmails,
      },
      emailType: emailType as 'daily_digest' | 'daily_pulse' | 'weekly_digest' | 'day_ahead' | 'reminder' | 'monthly_recap' | 'welcome' | 'system' | 'morning_briefing' | 'midday_pulse' | 'evening_winddown',
      sentAt: {
        gte: cutoff,
      },
      status: 'sent',
    },
  })
  
  return emails !== null
}

/**
 * Helper to get all email addresses for a user
 */
async function getUserEmails(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  
  if (!user) return []
  
  // Also check legacy accounts
  const phones = await prisma.phone.findMany({
    where: { accountId: userId },
    include: { account: { select: { email: true } } },
  })
  
  const emails = new Set<string>()
  if (user.email) emails.add(user.email.toLowerCase())
  phones.forEach(p => {
    if (p.account?.email) emails.add(p.account.email.toLowerCase())
  })
  
  return Array.from(emails)
}

/**
 * Helper to get all phone IDs for a user
 */
async function getUserPhoneIds(userId: string): Promise<string[]> {
  const phones = await prisma.phone.findMany({
    where: { accountId: userId },
    select: { id: true },
  })
  
  return phones.map(p => p.id)
}

/**
 * Record a delivery for tracking
 */
export async function recordDelivery(
  userId: string,
  type: 'email' | 'sms',
  metadata: {
    messageType: string
    timestamp?: Date
  }
): Promise<void> {
  // In a production system, this might write to a time-series DB
  // For now, we rely on the outbox tables as the source of truth
  console.log(`[FrequencyCap] Recorded ${type} delivery for ${userId}: ${metadata.messageType}`)
}

/**
 * Should we skip this digest due to low content value?
 */
export async function shouldSkipLowValueDigest(
  userId: string,
  itemCount: number,
  date: Date = new Date()
): Promise<{ skip: boolean; reason?: string }> {
  const { BATCHING_CONFIG } = await import('./delivery-config')
  const stats = await getUserDeliveryStats(userId, date)
  
  // Skip if below minimum items
  if (itemCount < BATCHING_CONFIG.MIN_DIGEST_ITEMS) {
    return {
      skip: true,
      reason: `Insufficient content (${itemCount} < ${BATCHING_CONFIG.MIN_DIGEST_ITEMS} items)`,
    }
  }
  
  // Skip if user already received an email today
  if (stats.emailsToday >= FREQUENCY_CAPS.EMAILS_PER_DAY) {
    return {
      skip: true,
      reason: 'Daily email limit already reached',
    }
  }
  
  return { skip: false }
}
