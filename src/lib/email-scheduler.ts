/**
 * Email Scheduler - CityPing Time-Slot Email System
 *
 * Core library for managing the 9am/noon/7pm email schedule.
 * Handles user filtering by time preference, content freshness checks,
 * and job coordination to prevent duplicate sends.
 *
 * Schedule:
 * - 9am (14:00 UTC): Morning Briefing - comprehensive daily digest
 * - Noon (17:00 UTC): Midday Pulse - breaking alerts + updates
 * - 7pm (00:00 UTC): Evening Wind-Down - day-ahead preview
 */

import { prisma } from './db'
import { sendEmailTracked, acquireJobLock, releaseJobLock, EmailType } from './email-outbox'
import { JobMonitor } from './job-monitor'
import { DateTime } from 'luxon'
import { checkEmailFrequencyCap } from './frequency-cap'
import { MESSAGE_PRIORITY } from './delivery-config'

// =============================================================================
// TYPES & CONFIGURATION
// =============================================================================

export type TimeSlot = 'morning' | 'noon' | 'evening'

export interface TimeSlotConfig {
  slot: TimeSlot
  displayName: string
  hourEt: number
  cronUtc: string
  emailType: EmailType
  contentWindowHours: number
  minFreshContentHours: number
  description: string
}

export const TIME_SLOT_CONFIG: Record<TimeSlot, TimeSlotConfig> = {
  morning: {
    slot: 'morning',
    displayName: 'Morning Briefing',
    hourEt: 9,
    cronUtc: '0 14 * * *', // 14:00 UTC = 9:00 ET
    emailType: 'morning_briefing',
    contentWindowHours: 12, // Look back 12 hours (9pm previous night)
    minFreshContentHours: 2,
    description: 'Comprehensive daily digest with overnight news, weather, and today\'s events',
  },
  noon: {
    slot: 'noon',
    displayName: 'Midday Pulse',
    hourEt: 12,
    cronUtc: '0 17 * * *', // 17:00 UTC = 12:00 ET
    emailType: 'midday_pulse',
    contentWindowHours: 4, // Look back 4 hours (since morning send)
    minFreshContentHours: 1,
    description: 'Breaking alerts, transit updates, and midday news brief',
  },
  evening: {
    slot: 'evening',
    displayName: 'Evening Wind-Down',
    hourEt: 19,
    cronUtc: '0 0 * * *', // 00:00 UTC = 19:00 ET (previous day)
    emailType: 'evening_winddown',
    contentWindowHours: 8, // Look back 8 hours (since noon)
    minFreshContentHours: 2,
    description: 'Day-ahead preview, parking reminders, and tomorrow planning',
  },
}

export interface EmailScheduleResult {
  success: boolean
  slot: TimeSlot
  totalUsers: number
  emailsSent: number
  skipped: number
  failed: number
  skippedReasons: Record<string, number>
  errors: string[]
  metadata: {
    contentFreshness: ContentFreshnessCheck
    processingTimeMs: number
  }
}

export interface ContentFreshnessCheck {
  hasFreshData: boolean
  totalEvents: number
  eventsInWindow: number
  newestEventAgeMinutes: number
  dataQuality: 'fresh' | 'stale' | 'insufficient'
}

export interface UserTimePreference {
  userId: string
  email: string
  tier: 'free' | 'premium'
  preferredSlots: TimeSlot[]
  lastEmailAt?: Date
  timezone: string
}

// =============================================================================
// USER PREFERENCE MANAGEMENT
// =============================================================================

/**
 * Get users filtered by time slot preference.
 *
 * - Free tier: Defaults to morning only, can opt into noon
 * - Premium tier: Defaults to all slots, can opt out of any
 * - All users can customize via preferences
 */
export async function getUsersForTimeSlot(
  slot: TimeSlot,
  options: { forceAll?: boolean } = {}
): Promise<UserTimePreference[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      tier: true,
      inferredNeighborhood: true,
    },
    // emailOptInAt has default(now()), so all users have it
    // No filter needed - all users are opted in
    where: {},
  })

  const userIds = users.map(u => u.id)

  // Fetch time preferences for all users in one query
  const preferences = await prisma.userDeliveryPreference.findMany({
    where: {
      userId: { in: userIds },
    },
  })

  const prefMap = new Map(preferences.map(p => [p.userId, p]))

  // Get last email times for frequency cap checking
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const recentEmails = await prisma.emailOutbox.findMany({
    where: {
      recipient: { in: users.map(u => u.email) },
      sentAt: { gte: today },
      status: 'sent',
    },
    orderBy: { sentAt: 'desc' },
  })

  const lastEmailMap = new Map<string, Date>()
  for (const email of recentEmails) {
    if (!lastEmailMap.has(email.recipient)) {
      lastEmailMap.set(email.recipient, email.sentAt!)
    }
  }

  return users.map(user => {
    const pref = prefMap.get(user.id)
    const preferredSlots = getPreferredSlots(user.tier, pref, slot)

    return {
      userId: user.id,
      email: user.email,
      tier: user.tier,
      preferredSlots,
      lastEmailAt: lastEmailMap.get(user.email),
      timezone: 'America/New_York', // Default to ET, can be customized
    }
  }).filter(user =>
    options.forceAll || user.preferredSlots.includes(slot)
  )
}

/**
 * Determine which time slots a user should receive.
 *
 * Logic:
 * - If user has explicit preferences, use those
 * - Free tier: morning only (can opt into noon)
 * - Premium tier: all slots by default (can opt out)
 */
function getPreferredSlots(
  tier: 'free' | 'premium',
  pref: { morningEnabled?: boolean; noonEnabled?: boolean; eveningEnabled?: boolean } | undefined,
  requestingSlot: TimeSlot
): TimeSlot[] {
  // If explicit preferences exist, use them
  if (pref) {
    const slots: TimeSlot[] = []
    if (pref.morningEnabled !== false) slots.push('morning')
    if (pref.noonEnabled) slots.push('noon')
    if (pref.eveningEnabled) slots.push('evening')
    return slots
  }

  // Default by tier
  if (tier === 'premium') {
    return ['morning', 'noon', 'evening']
  }

  // Free tier: morning only by default
  return ['morning']
}

// =============================================================================
// CONTENT FRESHNESS CHECKS
// =============================================================================

/**
 * Check if there's fresh content worth sending for this time slot.
 *
 * Each slot has different freshness requirements:
 * - Morning: Needs substantial content (12-hour window)
 * - Noon: Can send with just breaking alerts (4-hour window)
 * - Evening: Needs day-ahead content (8-hour window)
 */
export async function checkContentFreshness(
  slot: TimeSlot,
  config: TimeSlotConfig
): Promise<ContentFreshnessCheck> {
  const now = DateTime.now().setZone('America/New_York')
  const windowStart = now.minus({ hours: config.contentWindowHours })

  // Count events in the time window
  const totalEvents = await prisma.alertEvent.count()

  const eventsInWindow = await prisma.alertEvent.count({
    where: {
      createdAt: {
        gte: windowStart.toJSDate(),
        lte: now.toJSDate(),
      },
    },
  })

  // Get newest event age
  const newestEvent = await prisma.alertEvent.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const newestEventAgeMinutes = newestEvent
    ? Math.floor((now.toMillis() - newestEvent.createdAt.getTime()) / 60000)
    : Infinity

  // Determine data quality
  let dataQuality: 'fresh' | 'stale' | 'insufficient'

  if (newestEventAgeMinutes > 120) {
    dataQuality = 'stale'
  } else if (eventsInWindow < getMinEventsForSlot(slot)) {
    dataQuality = 'insufficient'
  } else {
    dataQuality = 'fresh'
  }

  const hasFreshData = dataQuality === 'fresh'

  return {
    hasFreshData,
    totalEvents,
    eventsInWindow,
    newestEventAgeMinutes,
    dataQuality,
  }
}

function getMinEventsForSlot(slot: TimeSlot): number {
  switch (slot) {
    case 'morning':
      return 5 // Comprehensive digest needs substantial content
    case 'noon':
      return 2 // Breaking alerts can be sparse
    case 'evening':
      return 3 // Day-ahead needs some planning content
    default:
      return 3
  }
}

// =============================================================================
// JOB COORDINATION
// =============================================================================

/**
 * Check if this time slot job should run.
 *
 * Prevents duplicate sends by checking:
 * 1. Distributed lock (prevent concurrent runs)
 * 2. Content freshness
 * 3. User frequency caps
 * 4. Previous email sends for this slot today
 */
export async function shouldRunTimeSlot(
  slot: TimeSlot,
  lockTtlMinutes: number = 30
): Promise<{
  shouldRun: boolean
  lockId: string | null
  freshness: ContentFreshnessCheck
  reason?: string
}> {
  // Acquire distributed lock
  const lockId = await acquireJobLock(`email-timeslot-${slot}`, lockTtlMinutes)
  if (!lockId) {
    return {
      shouldRun: false,
      lockId: null,
      freshness: await checkContentFreshness(slot, TIME_SLOT_CONFIG[slot]),
      reason: 'Another instance is already running',
    }
  }

  // Check content freshness
  const freshness = await checkContentFreshness(slot, TIME_SLOT_CONFIG[slot])

  // Morning slot can run even with stale data (fallback mode)
  // Noon/evening skip if no fresh content
  if (!freshness.hasFreshData && slot !== 'morning') {
    await releaseJobLock(`email-timeslot-${slot}`, lockId)
    return {
      shouldRun: false,
      lockId: null,
      freshness,
      reason: `Insufficient fresh content (${freshness.eventsInWindow} events, newest ${freshness.newestEventAgeMinutes}m ago)`,
    }
  }

  return {
    shouldRun: true,
    lockId,
    freshness,
  }
}

/**
 * Build content for a specific time slot.
 *
 * Each slot has different content mix:
 * - Morning: Full digest (news, weather, events, alerts)
 * - Noon: Breaking alerts + transit updates + news brief
 * - Evening: Day-ahead (parking, tomorrow events, weather)
 */
export async function buildSlotContent(
  slot: TimeSlot,
  userId?: string
): Promise<SlotContent> {
  const now = DateTime.now().setZone('America/New_York')
  const config = TIME_SLOT_CONFIG[slot]

  switch (slot) {
    case 'morning':
      return buildMorningContent(now, userId)
    case 'noon':
      return buildNoonContent(now, userId)
    case 'evening':
      return buildEveningContent(now, userId)
    default:
      throw new Error(`Unknown time slot: ${slot}`)
  }
}

export interface SlotContent {
  subject: string
  preheader: string
  sections: EmailSection[]
  metadata: {
    contentGeneratedAt: Date
    sourcesUsed: string[]
    freshness: ContentFreshnessCheck
  }
}

export interface EmailSection {
  type: 'breaking' | 'news' | 'weather' | 'transit' | 'parking' | 'events' | 'day_ahead' | 'deals'
  title: string
  priority: number
  items: EmailItem[]
}

export interface EmailItem {
  id: string
  title: string
  description?: string
  url?: string
  timestamp: Date
  source: string
  metadata?: Record<string, unknown>
}

async function buildMorningContent(
  now: DateTime,
  userId?: string
): Promise<SlotContent> {
  const todayStart = now.startOf('day').toJSDate()
  const todayEnd = now.endOf('day').toJSDate()

  // Fetch overnight news (since 9pm yesterday)
  const sinceLastNight = now.minus({ hours: 12 }).toJSDate()

  const [alertEvents, cityEvents, newsArticles] = await Promise.all([
    prisma.alertEvent.findMany({
      where: {
        createdAt: { gte: sinceLastNight },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now.toJSDate() } }],
      },
      include: { source: { include: { module: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.cityEvent.findMany({
      where: {
        status: { in: ['auto', 'published'] },
        startsAt: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { insiderScore: 'desc' },
      take: 8,
    }),
    prisma.newsArticle.findMany({
      where: {
        isSelected: true,
        curatedFor: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    }),
  ])

  const sections: EmailSection[] = []

  // Breaking alerts section
  const breakingAlerts = alertEvents.filter(e =>
    /breaking|urgent|emergency|suspended/i.test(e.title)
  )
  if (breakingAlerts.length > 0) {
    sections.push({
      type: 'breaking',
      title: 'Breaking Now',
      priority: 100,
      items: breakingAlerts.map(e => ({
        id: e.id,
        title: e.title,
        description: e.body?.slice(0, 200),
        timestamp: e.createdAt,
        source: e.source.module.name,
      })),
    })
  }

  // Top stories section
  if (newsArticles.length > 0) {
    sections.push({
      type: 'news',
      title: 'Top Stories',
      priority: 80,
      items: newsArticles.map(n => ({
        id: n.id,
        title: n.title,
        description: n.summary || n.snippet?.slice(0, 150),
        url: n.url,
        timestamp: n.publishedAt,
        source: n.source,
      })),
    })
  }

  // Today's events section
  if (cityEvents.length > 0) {
    sections.push({
      type: 'events',
      title: "Today's Events",
      priority: 60,
      items: cityEvents.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description?.slice(0, 150),
        url: e.sourceUrl || undefined,
        timestamp: e.startsAt || e.createdAt,
        source: e.sourceName || 'CityPing',
        metadata: { venue: e.venue || undefined, neighborhood: e.neighborhood || undefined },
      })),
    })
  }

  // Transit summary
  const transitAlerts = alertEvents.filter(e =>
    e.source.module.id === 'transit'
  )
  if (transitAlerts.length > 0) {
    sections.push({
      type: 'transit',
      title: 'Transit Now',
      priority: 70,
      items: transitAlerts.slice(0, 4).map(e => ({
        id: e.id,
        title: e.title,
        description: e.body?.slice(0, 100),
        timestamp: e.createdAt,
        source: 'MTA',
      })),
    })
  }

  return {
    subject: `CityPing Morning Briefing - ${now.toFormat('EEEE, MMMM d')}`,
    preheader: `${breakingAlerts.length > 0 ? `${breakingAlerts.length} breaking alerts • ` : ''}${newsArticles.length} stories • ${cityEvents.length} events today`,
    sections: sections.sort((a, b) => b.priority - a.priority),
    metadata: {
      contentGeneratedAt: new Date(),
      sourcesUsed: ['alert_events', 'city_events', 'news_articles'],
      freshness: await checkContentFreshness('morning', TIME_SLOT_CONFIG.morning),
    },
  }
}

async function buildNoonContent(
  now: DateTime,
  userId?: string
): Promise<SlotContent> {
  // Look back 4 hours since morning send
  const sinceMorning = now.minus({ hours: 4 }).toJSDate()

  const [alertEvents, breakingNews] = await Promise.all([
    prisma.alertEvent.findMany({
      where: {
        createdAt: { gte: sinceMorning },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now.toJSDate() } }],
      },
      include: { source: { include: { module: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: sinceMorning },
        isSelected: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    }),
  ])

  const sections: EmailSection[] = []

  // Focus on breaking/new alerts since morning
  const newAlerts = alertEvents.filter(e =>
    e.createdAt > sinceMorning
  )

  if (newAlerts.length > 0) {
    sections.push({
      type: 'breaking',
      title: 'New Since This Morning',
      priority: 100,
      items: newAlerts.map(e => ({
        id: e.id,
        title: e.title,
        description: e.body?.slice(0, 150),
        timestamp: e.createdAt,
        source: e.source.module.name,
      })),
    })
  }

  // Updated transit
  const transitUpdates = alertEvents.filter(e =>
    e.source.module.id === 'transit'
  )
  if (transitUpdates.length > 0) {
    sections.push({
      type: 'transit',
      title: 'Transit Updates',
      priority: 80,
      items: transitUpdates.slice(0, 4).map(e => ({
        id: e.id,
        title: e.title,
        description: e.body?.slice(0, 100),
        timestamp: e.createdAt,
        source: 'MTA',
      })),
    })
  }

  // Quick news brief
  if (breakingNews.length > 0) {
    sections.push({
      type: 'news',
      title: 'Developing Stories',
      priority: 60,
      items: breakingNews.map(n => ({
        id: n.id,
        title: n.title,
        description: n.summary?.slice(0, 100),
        url: n.url,
        timestamp: n.publishedAt,
        source: n.source,
      })),
    })
  }

  return {
    subject: `CityPing Midday Pulse - ${now.toFormat('EEEE, MMMM d')}`,
    preheader: `${newAlerts.length} new alerts • ${transitUpdates.length} transit updates`,
    sections: sections.sort((a, b) => b.priority - a.priority),
    metadata: {
      contentGeneratedAt: new Date(),
      sourcesUsed: ['alert_events', 'news_articles'],
      freshness: await checkContentFreshness('noon', TIME_SLOT_CONFIG.noon),
    },
  }
}

async function buildEveningContent(
  now: DateTime,
  userId?: string
): Promise<SlotContent> {
  const tomorrow = now.plus({ days: 1 })
  const tomorrowStart = tomorrow.startOf('day').toJSDate()
  const tomorrowEnd = tomorrow.endOf('day').toJSDate()

  const [parkingAlerts, tomorrowEvents, suspensions] = await Promise.all([
    prisma.alertEvent.findMany({
      where: {
        source: { moduleId: 'parking' },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now.toJSDate() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.cityEvent.findMany({
      where: {
        status: { in: ['auto', 'published'] },
        startsAt: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      orderBy: { insiderScore: 'desc' },
      take: 6,
    }),
    prisma.suspensionEvent.findMany({
      where: {
        date: tomorrowStart,
      },
    }),
  ])

  const sections: EmailSection[] = []

  // Day-ahead parking section
  if (suspensions.length > 0 || parkingAlerts.length > 0) {
    sections.push({
      type: 'parking',
      title: `Tomorrow's Parking (${tomorrow.toFormat('EEEE, MMMM d')})`,
      priority: 100,
      items: [
        ...suspensions.map(s => ({
          id: s.id,
          title: s.summary || 'Alternate Side Suspended',
          description: 'ASP rules suspended for this date',
          timestamp: s.lastSeenAt,
          source: 'NYC DOT',
        })),
        ...parkingAlerts.map(e => ({
          id: e.id,
          title: e.title,
          description: e.body?.slice(0, 100),
          timestamp: e.createdAt,
          source: 'CityPing',
        })),
      ],
    })
  }

  // Tomorrow's events preview
  if (tomorrowEvents.length > 0) {
    sections.push({
      type: 'day_ahead',
      title: 'Tomorrow Preview',
      priority: 80,
      items: tomorrowEvents.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description?.slice(0, 150),
        url: e.sourceUrl || undefined,
        timestamp: e.startsAt || e.createdAt,
        source: e.sourceName || 'CityPing',
        metadata: { venue: e.venue || undefined, neighborhood: e.neighborhood || undefined },
      })),
    })
  }

  return {
    subject: `CityPing Evening Wind-Down - Tomorrow's Prep`,
    preheader: `${suspensions.length > 0 ? 'ASP suspended tomorrow • ' : ''}${tomorrowEvents.length} events tomorrow`,
    sections: sections.sort((a, b) => b.priority - a.priority),
    metadata: {
      contentGeneratedAt: new Date(),
      sourcesUsed: ['suspension_events', 'city_events', 'alert_events'],
      freshness: await checkContentFreshness('evening', TIME_SLOT_CONFIG.evening),
    },
  }
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send time-slot emails to users.
 *
 * Coordinates sending with:
 * - Frequency cap checking
 * - Idempotency tracking
 * - Error handling
 */
export async function sendTimeSlotEmails(
  slot: TimeSlot,
  users: UserTimePreference[],
  contentBuilder: (userId?: string) => Promise<SlotContent>
): Promise<{
  sent: number
  skipped: number
  failed: number
  skippedReasons: Record<string, number>
  errors: string[]
}> {
  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    skippedReasons: {} as Record<string, number>,
    errors: [] as string[],
  }

  const config = TIME_SLOT_CONFIG[slot]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const user of users) {
    try {
      // Check frequency cap
      const capCheck = await checkEmailFrequencyCap(user.userId, config.emailType, today)
      if (!capCheck.allowed) {
        results.skipped++
        results.skippedReasons['frequency_cap'] = (results.skippedReasons['frequency_cap'] || 0) + 1
        continue
      }

      // Build personalized content
      const content = await contentBuilder(user.userId)

      // Skip if no content sections
      if (content.sections.length === 0) {
        results.skipped++
        results.skippedReasons['no_content'] = (results.skippedReasons['no_content'] || 0) + 1
        continue
      }

      // Generate HTML (placeholder - actual template would be used)
      const html = generateEmailHtml(slot, content, user)
      const text = generateEmailText(slot, content, user)

      // Send with tracking
      const result = await sendEmailTracked(
        {
          to: user.email,
          subject: content.subject,
          html,
          text,
        },
        config.emailType,
        today,
        {
          userId: user.userId,
          slot,
          tier: user.tier,
          sections: content.sections.map(s => s.type),
        }
      )

      if (result.alreadySent) {
        results.skipped++
        results.skippedReasons['already_sent'] = (results.skippedReasons['already_sent'] || 0) + 1
      } else if (result.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`${user.email}: ${result.error}`)
      }
    } catch (error) {
      results.failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`${user.email}: ${errorMsg}`)
    }
  }

  return results
}

// Placeholder HTML generator - actual implementation would use templates
function generateEmailHtml(
  slot: TimeSlot,
  content: SlotContent,
  user: UserTimePreference
): string {
  // This would use the actual email template system
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a;">${TIME_SLOT_CONFIG[slot].displayName}</h1>
  <p style="color: #666;">${content.preheader}</p>
  ${content.sections.map(section => `
    <section style="margin: 24px 0; border-top: 1px solid #eee; padding-top: 16px;">
      <h2 style="color: #333; font-size: 18px;">${section.title}</h2>
      ${section.items.map(item => `
        <div style="margin: 12px 0;">
          <h3 style="margin: 0; font-size: 16px; color: #0066cc;">${item.title}</h3>
          ${item.description ? `<p style="margin: 4px 0; color: #555; font-size: 14px;">${item.description}</p>` : ''}
          ${item.url ? `<a href="${item.url}" style="color: #0066cc; font-size: 14px;">Read more →</a>` : ''}
        </div>
      `).join('')}
    </section>
  `).join('')}
  <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p>You're receiving this because you're subscribed to CityPing ${TIME_SLOT_CONFIG[slot].displayName}.</p>
    <p><a href="https://cityping.net/preferences">Manage preferences</a></p>
  </footer>
</body>
</html>
  `.trim()
}

function generateEmailText(
  slot: TimeSlot,
  content: SlotContent,
  user: UserTimePreference
): string {
  return `${content.subject}

${content.preheader}

${content.sections.map(section => `
${section.title}
${'-'.repeat(section.title.length)}

${section.items.map(item => `
${item.title}
${item.description || ''}
${item.url || ''}
`).join('\n')}
`).join('\n')}

---
CityPing | https://cityping.net/preferences
`.trim()
}

// =============================================================================
// MAIN ORCHESTRATION
// =============================================================================

/**
 * Execute a time-slot email job.
 *
 * This is the main entry point for the cron jobs.
 */
export async function executeTimeSlotJob(
  slot: TimeSlot,
  options: { force?: boolean; testUsers?: string[] } = {}
): Promise<EmailScheduleResult> {
  const startTime = Date.now()
  const config = TIME_SLOT_CONFIG[slot]

  console.log(`[EmailScheduler] Starting ${config.displayName} job`)

  // Check if should run
  const runCheck = await shouldRunTimeSlot(slot)
  if (!runCheck.shouldRun && !options.force) {
    console.log(`[EmailScheduler] Skipping ${slot}: ${runCheck.reason}`)
    return {
      success: true,
      slot,
      totalUsers: 0,
      emailsSent: 0,
      skipped: 0,
      failed: 0,
      skippedReasons: { [runCheck.reason || 'unknown']: 1 },
      errors: [],
      metadata: {
        contentFreshness: runCheck.freshness,
        processingTimeMs: Date.now() - startTime,
      },
    }
  }

  const lockId = runCheck.lockId!
  const jobMonitor = await JobMonitor.start(`email-timeslot-${slot}`)

  try {
    // Get users for this slot
    const users = options.testUsers
      ? await getUsersForTimeSlot(slot, { forceAll: true }).then(u =>
          u.filter(user => options.testUsers!.includes(user.userId))
        )
      : await getUsersForTimeSlot(slot)

    console.log(`[EmailScheduler] Found ${users.length} users for ${slot}`)

    // Send emails
    const sendResults = await sendTimeSlotEmails(slot, users, (userId) =>
      buildSlotContent(slot, userId)
    )

    const result: EmailScheduleResult = {
      success: sendResults.failed === 0 || sendResults.sent > 0,
      slot,
      totalUsers: users.length,
      emailsSent: sendResults.sent,
      skipped: sendResults.skipped,
      failed: sendResults.failed,
      skippedReasons: sendResults.skippedReasons,
      errors: sendResults.errors,
      metadata: {
        contentFreshness: runCheck.freshness,
        processingTimeMs: Date.now() - startTime,
      },
    }

    console.log(`[EmailScheduler] ${slot} complete: ${result.emailsSent} sent, ${result.skipped} skipped, ${result.failed} failed`)

    await jobMonitor.success({
      itemsProcessed: result.emailsSent,
      itemsFailed: result.failed,
      metadata: {
        totalUsers: result.totalUsers,
        skipped: result.skipped,
        skippedReasons: result.skippedReasons,
        freshness: runCheck.freshness,
      },
    })

    await releaseJobLock(`email-timeslot-${slot}`, lockId)
    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[EmailScheduler] ${slot} job failed:`, error)

    await jobMonitor.fail(error)
    await releaseJobLock(`email-timeslot-${slot}`, lockId)

    return {
      success: false,
      slot,
      totalUsers: 0,
      emailsSent: 0,
      skipped: 0,
      failed: 0,
      skippedReasons: { error: 1 },
      errors: [errorMsg],
      metadata: {
        contentFreshness: runCheck.freshness,
        processingTimeMs: Date.now() - startTime,
      },
    }
  }
}
