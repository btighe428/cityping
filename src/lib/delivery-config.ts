// Delivery timing configuration and constants
// Centralizes all delivery windows and frequency limits

/**
 * Timezone for all delivery calculations
 */
export const DELIVERY_TIMEZONE = 'America/New_York'

/**
 * Delivery windows - when emails should be sent
 * All times in 24-hour format, ET
 */
export const DELIVERY_WINDOWS = {
  /**
   * Morning digest - main daily briefing
   * 7:00 AM ET - when users check email
   */
  MORNING_DIGEST: {
    hour: 7,
    minute: 0,
    cron: '0 12 * * *', // 12:00 UTC = 7:00 ET
  },
  
  /**
   * Morning pulse - quick alerts (staggered after digest)
   * 7:30 AM ET - only if urgent content exists
   */
  MORNING_PULSE: {
    hour: 7,
    minute: 30,
    cron: '30 12 * * 1-5', // 12:30 UTC, weekdays only
  },
  
  /**
   * Evening day-ahead - prepare for tomorrow
   * 6:00 PM ET - when people think about tomorrow
   */
  DAY_AHEAD: {
    hour: 18,
    minute: 0,
    cron: '0 23 * * *', // 23:00 UTC = 18:00 ET
  },
  
  /**
   * Evening reminders - ASP and parking alerts
   * 7:00 PM ET - night before suspension
   */
  REMINDERS: {
    hour: 19,
    minute: 0,
    cron: '0 0 * * *', // 00:00 UTC = 19:00 ET (prev day)
  },
  
  /**
   * Weekly digest - Sunday morning planning
   * 8:00 AM ET
   */
  WEEKLY_DIGEST: {
    hour: 8,
    minute: 0,
    cron: '0 13 * * 0', // 13:00 UTC Sunday = 8:00 ET
  },
} as const

/**
 * Frequency caps - maximum messages per time period
 */
export const FREQUENCY_CAPS = {
  /**
   * Maximum emails per day per user
   * Prevent email fatigue
   */
  EMAILS_PER_DAY: 2,
  
  /**
   * Maximum SMS per day per user
   * SMS is more intrusive, stricter limit
   */
  SMS_PER_DAY: 3,
  
  /**
   * Maximum digests per week
   * Ensures weekly digest doesn't duplicate daily content
   */
  DIGESTS_PER_WEEK: 5,
  
  /**
   * Cooldown period between similar messages (hours)
   * Prevents duplicate notifications for same event type
   */
  SAME_TYPE_COOLDOWN_HOURS: 4,
} as const

/**
 * Priority levels for message routing
 */
export const MESSAGE_PRIORITY = {
  /**
   * Critical - always deliver immediately
   * Examples: Emergency alerts, severe weather
   */
  CRITICAL: 100,
  
  /**
   * Urgent - deliver in next batch, bypass frequency cap
   * Examples: ASP suspension day-of, transit outage
   */
  URGENT: 80,
  
   /**
   * Important - standard delivery, respect frequency cap
   * Examples: Daily digest content, day-ahead reminders
   */
  IMPORTANT: 50,
  
  /**
   * Routine - deliver if under frequency cap
   * Examples: Monthly recaps, non-urgent updates
   */
  ROUTINE: 30,
  
  /**
   * Low - suppress if user near frequency cap
   * Examples: Optional features, tips
   */
  LOW: 10,
} as const

/**
 * Batching configuration
 */
export const BATCHING_CONFIG = {
  /**
   * Minimum batch size for digest
   * Below this, consider skipping the email
   */
  MIN_DIGEST_ITEMS: 3,
  
  /**
   * Maximum items per digest
   * Keep emails scannable
   */
  MAX_DIGEST_ITEMS: 10,
  
  /**
   * Hours to batch free-tier notifications
   */
  FREE_TIER_BATCH_HOURS: 24,
  
  /**
   * Minutes between SMS sends (rate limiting)
   */
  SMS_RATE_LIMIT_MS: 1000,
  
  /**
   * Batch size for notification processing
   */
  NOTIFICATION_BATCH_SIZE: 100,
} as const

/**
 * Check if current time is within quiet hours
 * Quiet hours: 10 PM - 7 AM ET
 */
export function isQuietHours(date: Date = new Date()): boolean {
  const etHour = new Date(date.toLocaleString('en-US', { 
    timeZone: DELIVERY_TIMEZONE,
    hour12: false,
  })).getHours()
  
  return etHour >= 22 || etHour < 7
}

/**
 * Get next valid delivery time (skip quiet hours)
 */
export function getNextDeliveryTime(preferredTime: Date): Date {
  if (!isQuietHours(preferredTime)) {
    return preferredTime
  }
  
  // Move to 7 AM next day
  const next = new Date(preferredTime)
  next.setHours(7, 0, 0, 0)
  if (preferredTime.getHours() >= 22) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

/**
 * Map email types to priority levels
 */
export function getEmailPriority(emailType: string): number {
  const priorities: Record<string, number> = {
    'daily_digest': MESSAGE_PRIORITY.IMPORTANT,
    'daily_pulse': MESSAGE_PRIORITY.IMPORTANT,
    'weekly_digest': MESSAGE_PRIORITY.IMPORTANT,
    'day_ahead': MESSAGE_PRIORITY.IMPORTANT,
    'reminder': MESSAGE_PRIORITY.URGENT,
    'monthly_recap': MESSAGE_PRIORITY.ROUTINE,
    'welcome': MESSAGE_PRIORITY.URGENT,
    'system': MESSAGE_PRIORITY.CRITICAL,
    // Time-slot email system (v2)
    'morning_briefing': MESSAGE_PRIORITY.IMPORTANT,
    'midday_pulse': MESSAGE_PRIORITY.IMPORTANT,
    'evening_winddown': MESSAGE_PRIORITY.IMPORTANT,
  }

  return priorities[emailType] ?? MESSAGE_PRIORITY.ROUTINE
}
