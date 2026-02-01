/**
 * Smart Delivery Router
 * 
 * Routes messages through the appropriate channel based on:
 * - User tier (free vs premium)
 * - Message priority (critical > urgent > important > routine)
 * - Time of day (respect quiet hours)
 * - User preferences and frequency caps
 */

import { prisma } from './db'
import { 
  MESSAGE_PRIORITY, 
  DELIVERY_WINDOWS,
  isQuietHours,
  getNextDeliveryTime,
} from './delivery-config'
import { 
  checkEmailFrequencyCap, 
  checkSmsFrequencyCap,
  getUserDeliveryStats,
} from './frequency-cap'
import type { UserTier } from './matching'

export interface DeliveryDecision {
  shouldSend: boolean
  channel: 'sms' | 'email' | 'none'
  timing: 'immediate' | 'batched' | 'scheduled'
  scheduledFor?: Date
  reason: string
}

export interface DeliveryContext {
  userId: string
  userTier: UserTier
  eventPriority: number
  eventType: string
  hasSmsOptIn: boolean
  preferredChannels?: ('sms' | 'email')[]
}

/**
 * Route a message through the appropriate delivery path
 */
export async function routeDelivery(
  context: DeliveryContext,
  now: Date = new Date()
): Promise<DeliveryDecision> {
  const { userId, userTier, eventPriority, eventType, hasSmsOptIn } = context
  
  // Check frequency caps first
  const [emailCheck, smsCheck] = await Promise.all([
    checkEmailFrequencyCap(userId, eventType, now),
    hasSmsOptIn ? checkSmsFrequencyCap(userId, eventType, now) : Promise.resolve({ allowed: false, reason: 'No SMS opt-in', currentCount: 0, limit: 0 }),
  ])
  
  // Critical priority: always try to deliver immediately
  if (eventPriority >= MESSAGE_PRIORITY.CRITICAL) {
    return routeCriticalMessage(context, emailCheck.allowed, smsCheck.allowed, now)
  }
  
  // Urgent priority: deliver immediately if within caps
  if (eventPriority >= MESSAGE_PRIORITY.URGENT) {
    return routeUrgentMessage(context, emailCheck.allowed, smsCheck.allowed, now)
  }
  
  // Important priority: respect caps, batch for free tier
  if (eventPriority >= MESSAGE_PRIORITY.IMPORTANT) {
    return routeImportantMessage(context, emailCheck.allowed, now)
  }
  
  // Routine priority: batch everything
  return routeRoutineMessage(context, emailCheck.allowed, now)
}

/**
 * Route critical messages (emergency, severe weather)
 */
function routeCriticalMessage(
  context: DeliveryContext,
  canEmail: boolean,
  canSms: boolean,
  now: Date
): DeliveryDecision {
  const { hasSmsOptIn } = context
  
  // Critical messages try all channels
  if (hasSmsOptIn && canSms) {
    return {
      shouldSend: true,
      channel: 'sms',
      timing: 'immediate',
      reason: 'Critical priority - SMS immediate delivery',
    }
  }
  
  if (canEmail) {
    return {
      shouldSend: true,
      channel: 'email',
      timing: isQuietHours(now) ? 'scheduled' : 'immediate',
      scheduledFor: isQuietHours(now) ? getNextDeliveryTime(now) : undefined,
      reason: 'Critical priority - email delivery (quiet hours respected)',
    }
  }
  
  // Fall back to scheduled if all caps exceeded
  return {
    shouldSend: true,
    channel: 'email',
    timing: 'scheduled',
    scheduledFor: getNextDeliveryTime(new Date(now.getTime() + 60 * 60 * 1000)),
    reason: 'Critical priority - scheduled due to rate limits',
  }
}

/**
 * Route urgent messages (ASP suspension day-of, transit outage)
 */
function routeUrgentMessage(
  context: DeliveryContext,
  canEmail: boolean,
  canSms: boolean,
  now: Date
): DeliveryDecision {
  const { userTier, hasSmsOptIn } = context
  
  // Premium users with SMS get immediate delivery
  if (userTier === 'premium' && hasSmsOptIn && canSms) {
    return {
      shouldSend: true,
      channel: 'sms',
      timing: 'immediate',
      reason: 'Urgent priority - premium SMS',
    }
  }
  
  // Premium users get immediate email
  if (userTier === 'premium' && canEmail) {
    return {
      shouldSend: true,
      channel: 'email',
      timing: isQuietHours(now) ? 'scheduled' : 'immediate',
      scheduledFor: isQuietHours(now) ? getNextDeliveryTime(now) : undefined,
      reason: 'Urgent priority - premium email',
    }
  }
  
  // Free tier gets batched unless in digest window
  if (canEmail) {
    const nextDigest = getNextDigestTime(now)
    return {
      shouldSend: true,
      channel: 'email',
      timing: 'batched',
      scheduledFor: nextDigest,
      reason: 'Urgent priority - free tier batched',
    }
  }
  
  return {
    shouldSend: false,
    channel: 'none',
    timing: 'immediate',
    reason: 'Urgent priority - suppressed due to rate limits',
  }
}

/**
 * Route important messages (daily digest content, day-ahead)
 */
async function routeImportantMessage(
  context: DeliveryContext,
  canEmail: boolean,
  now: Date
): Promise<DeliveryDecision> {
  const { userTier } = context
  
  if (!canEmail) {
    return {
      shouldSend: false,
      channel: 'none',
      timing: 'immediate',
      reason: 'Email frequency cap reached',
    }
  }
  
  // Both tiers get batched, but premium might get earlier
  const scheduledFor = userTier === 'premium' 
    ? getNextDigestTime(now, true) // Earlier window for premium
    : getNextDigestTime(now, false)
  
  return {
    shouldSend: true,
    channel: 'email',
    timing: 'batched',
    scheduledFor,
    reason: `Important priority - batched for ${userTier} tier`,
  }
}

/**
 * Route routine messages (monthly recaps, tips)
 */
async function routeRoutineMessage(
  context: DeliveryContext,
  canEmail: boolean,
  now: Date
): Promise<DeliveryDecision> {
  const stats = await getUserDeliveryStats(context.userId, now)
  const { FREQUENCY_CAPS } = await import('./delivery-config')
  
  // Suppress routine messages if user is near cap
  if (stats.emailsToday >= FREQUENCY_CAPS.EMAILS_PER_DAY - 1) {
    return {
      shouldSend: false,
      channel: 'none',
      timing: 'immediate',
      reason: 'Routine priority - suppressed to preserve daily limit',
    }
  }
  
  if (!canEmail) {
    return {
      shouldSend: false,
      channel: 'none',
      timing: 'immediate',
      reason: 'Email frequency cap reached',
    }
  }
  
  // Batch for digest
  return {
    shouldSend: true,
    channel: 'email',
    timing: 'batched',
    scheduledFor: getNextDigestTime(now),
    reason: 'Routine priority - batched',
  }
}

/**
 * Calculate the next digest delivery time
 */
function getNextDigestTime(now: Date = new Date(), isPremium: boolean = false): Date {
  const hour = now.getHours()
  const minute = now.getMinutes()
  
  // Morning digest window: 7:00 AM
  const morningHour = DELIVERY_WINDOWS.MORNING_DIGEST.hour
  
  // If before morning digest, schedule for this morning
  if (hour < morningHour || (hour === morningHour && minute < 30)) {
    const next = new Date(now)
    next.setHours(morningHour, isPremium ? 0 : 15, 0, 0) // Premium gets first batch
    return next
  }
  
  // If between morning and evening, schedule for evening
  const eveningHour = DELIVERY_WINDOWS.DAY_AHEAD.hour
  if (hour < eveningHour) {
    const next = new Date(now)
    next.setHours(eveningHour, isPremium ? 0 : 15, 0, 0)
    return next
  }
  
  // After evening, schedule for tomorrow morning
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(morningHour, isPremium ? 0 : 15, 0, 0)
  return tomorrow
}

/**
 * Enqueue a notification with smart routing
 */
export async function enqueueSmartNotification(
  userId: string,
  eventId: string,
  priority: number,
  eventType: string
): Promise<DeliveryDecision> {
  // Get user context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      smsOptInStatus: true,
      phone: true,
    },
  })
  
  if (!user) {
    return {
      shouldSend: false,
      channel: 'none',
      timing: 'immediate',
      reason: 'User not found',
    }
  }
  
  const decision = await routeDelivery({
    userId,
    userTier: user.tier as UserTier,
    eventPriority: priority,
    eventType,
    hasSmsOptIn: user.smsOptInStatus === 'confirmed' && !!user.phone,
  })
  
  if (!decision.shouldSend) {
    return decision
  }
  
  // Create notification outbox entry (only if channel is email or sms)
  if (decision.channel === 'email' || decision.channel === 'sms') {
    await prisma.notificationOutbox.create({
      data: {
        userId,
        eventId,
        channel: decision.channel,
        scheduledFor: decision.scheduledFor ?? new Date(),
        status: 'pending',
      },
    })
  }
  
  return decision
}

/**
 * Batch multiple events into a single scheduled notification
 */
export async function batchNotifications(
  userId: string,
  eventIds: string[],
  priority: number,
  eventType: string
): Promise<DeliveryDecision> {
  if (eventIds.length === 0) {
    return {
      shouldSend: false,
      channel: 'none',
      timing: 'immediate',
      reason: 'No events to batch',
    }
  }
  
  // Use the highest priority from the batch
  const decision = await enqueueSmartNotification(userId, eventIds[0], priority, eventType)
  
  // For remaining events, create batched entries with same scheduled time
  const remaining = eventIds.slice(1)
  if (remaining.length > 0 && decision.shouldSend && decision.scheduledFor) {
    await Promise.all(
      remaining.map(eventId =>
        prisma.notificationOutbox.create({
          data: {
            userId,
            eventId,
            channel: decision.channel as 'email' | 'sms',
            scheduledFor: decision.scheduledFor,
            status: 'pending',
          },
        }).catch(() => {
          // Ignore duplicates
        })
      )
    )
  }
  
  return decision
}
