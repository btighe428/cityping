/**
 * CONTENT ROUTER
 * 
 * Decision engine for CityPing's 3x daily emails:
 * - 9am Morning Brief (commute prep)
 * - 12pm Midday Update (flexible content)
 * - 6pm Evening Digest (tomorrow planning)
 * 
 * Handles:
 * - Content categorization (urgent/time-sensitive/evergreen/batchable)
 * - Time slot routing
 * - Cross-send deduplication
 * - Freshness validation
 * - Scarcity/abundance rules
 */

import { prisma } from './db'
import { DELIVERY_TIMEZONE } from './delivery-config'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Content urgency categories
 */
export type ContentUrgency = 
  | 'urgent'        // Must send immediately (emergency alerts, severe weather)
  | 'time_sensitive' // Best at specific times (transit alerts, ASP reminders)
  | 'evergreen'     // Can go in any slot (tips, general news)
  | 'batchable'     // Accumulate for next send (low-priority updates)

/**
 * Time slots for the 3x daily emails
 */
export type TimeSlot = 'morning' | 'midday' | 'evening'

/**
 * Content types that CityPing handles
 */
export type ContentType =
  // Parking
  | 'asp_status'           // Today's ASP status
  | 'asp_suspension'       // ASP suspended (good news)
  | 'asp_in_effect'        // ASP active (need to move)
  | 'asp_tomorrow'         // Tomorrow's ASP preview
  | 'meter_status'         // Meter rules
  | 'parking_emergency'    // Emergency no-parking zones
  // Transit
  | 'transit_delay'        // Active delays
  | 'transit_outage'       // Service suspended
  | 'transit_advisory'     // Planned work
  | 'transit_restoration'  // Service restored
  // Weather
  | 'weather_severe'       // Severe weather alert
  | 'weather_advisory'     // Weather advisory (rain, snow, heat)
  | 'weather_daily'        // Daily forecast
  // News & Events
  | 'breaking_news'        // Breaking local news
  | 'local_news'           // General local news
  | 'event_reminder'       // Upcoming event
  | 'street_closure'       // Street closures
  // System
  | 'welcome'              // Welcome email
  | 'weekly_recap'         // Weekly summary
  | 'tips'                 // Parking tips
  | 'neighborhood_update'  // Neighborhood-specific

/**
 * A piece of content to be routed
 */
export interface ContentItem {
  id: string
  type: ContentType
  title: string
  body?: string
  priority: number              // 0-100, higher = more important
  createdAt: Date
  expiresAt?: Date              // After this, don't send
  validSlots?: TimeSlot[]       // If set, only these slots
  sourceId?: string             // External source ID for dedup
  metadata?: Record<string, unknown>
}

/**
 * Routing decision for a content item
 */
export interface RoutingDecision {
  item: ContentItem
  action: 'include' | 'defer' | 'skip' | 'send_immediate'
  targetSlot: TimeSlot | 'immediate'
  reason: string
  deferUntil?: Date
}

/**
 * Content bucket for a time slot
 */
export interface SlotBucket {
  slot: TimeSlot
  items: ContentItem[]
  totalPriority: number
  isFull: boolean
}

/**
 * Send history for deduplication
 */
export interface SendHistoryEntry {
  contentId: string
  contentType: ContentType
  sourceId?: string
  sentAt: Date
  slot: TimeSlot
  version: number              // Increments on updates
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Content type → urgency mapping
 */
export const CONTENT_URGENCY: Record<ContentType, ContentUrgency> = {
  // Urgent - immediate delivery
  parking_emergency: 'urgent',
  transit_outage: 'urgent',
  weather_severe: 'urgent',
  breaking_news: 'urgent',
  
  // Time-sensitive - best at specific times
  asp_status: 'time_sensitive',
  asp_suspension: 'time_sensitive',
  asp_in_effect: 'time_sensitive',
  asp_tomorrow: 'time_sensitive',
  transit_delay: 'time_sensitive',
  transit_advisory: 'time_sensitive',
  weather_advisory: 'time_sensitive',
  event_reminder: 'time_sensitive',
  street_closure: 'time_sensitive',
  
  // Evergreen - any slot
  weather_daily: 'evergreen',
  local_news: 'evergreen',
  meter_status: 'evergreen',
  transit_restoration: 'evergreen',
  welcome: 'evergreen',
  
  // Batchable - accumulate
  tips: 'batchable',
  neighborhood_update: 'batchable',
  weekly_recap: 'batchable',
}

/**
 * Preferred time slots for each content type
 * First slot is preferred, others are fallback
 */
export const PREFERRED_SLOTS: Record<ContentType, TimeSlot[]> = {
  // Morning: commute-focused
  asp_status: ['morning'],
  asp_suspension: ['morning', 'evening'],     // Also evening for tomorrow
  asp_in_effect: ['morning'],
  transit_delay: ['morning', 'midday'],       // Real-time, any active slot
  transit_outage: ['morning', 'midday', 'evening'], // Any slot
  transit_advisory: ['evening', 'morning'],   // Plan ahead
  transit_restoration: ['midday', 'evening'],
  weather_severe: ['morning', 'midday', 'evening'], // Any slot
  weather_advisory: ['morning', 'evening'],
  weather_daily: ['morning'],
  
  // Evening: tomorrow planning
  asp_tomorrow: ['evening'],
  event_reminder: ['morning', 'evening'],
  street_closure: ['morning', 'evening'],
  
  // Flexible
  breaking_news: ['morning', 'midday', 'evening'],
  local_news: ['midday', 'evening', 'morning'],
  parking_emergency: ['morning', 'midday', 'evening'],
  meter_status: ['morning'],
  
  // System
  welcome: ['morning', 'midday', 'evening'],
  weekly_recap: ['morning'],
  tips: ['midday', 'evening'],
  neighborhood_update: ['evening'],
}

/**
 * Maximum content items per slot
 */
export const SLOT_LIMITS: Record<TimeSlot, number> = {
  morning: 8,   // Quick scan before commute
  midday: 6,    // Brief check during day
  evening: 10,  // More time to read
}

/**
 * Minimum items to send a slot (skip if below)
 */
export const SLOT_MINIMUMS: Record<TimeSlot, number> = {
  morning: 2,   // At least parking + weather
  midday: 3,    // Need enough to justify interruption
  evening: 2,   // At least tomorrow preview
}

/**
 * Content freshness windows (hours)
 * Content older than this won't be included
 */
export const FRESHNESS_WINDOWS: Record<ContentUrgency, number> = {
  urgent: 1,          // 1 hour for emergencies
  time_sensitive: 6,  // 6 hours for time-sensitive
  evergreen: 24,      // 24 hours for evergreen
  batchable: 72,      // 3 days for batchable
}

/**
 * Hours between time slots
 */
export const SLOT_TIMES: Record<TimeSlot, number> = {
  morning: 9,   // 9am ET
  midday: 12,   // 12pm ET
  evening: 18,  // 6pm ET
}

// =============================================================================
// CORE ROUTING ENGINE
// =============================================================================

export class ContentRouter {
  private sendHistory: Map<string, SendHistoryEntry> = new Map()
  private pendingContent: Map<TimeSlot, ContentItem[]> = new Map()
  
  constructor() {
    this.pendingContent.set('morning', [])
    this.pendingContent.set('midday', [])
    this.pendingContent.set('evening', [])
  }
  
  /**
   * Load send history from database for deduplication
   */
  async loadHistory(userId: string, lookbackHours: number = 24): Promise<void> {
    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
    
    const history = await prisma.emailOutbox.findMany({
      where: {
        recipient: userId,
        sentAt: { gte: cutoff },
        status: 'sent',
      },
      select: {
        id: true,
        emailType: true,
        sentAt: true,
        metadata: true,
      },
    })
    
    for (const entry of history) {
      const meta = entry.metadata as Record<string, unknown> | null
      const contentItems = (meta?.contentItems as string[]) || []
      
      for (const contentId of contentItems) {
        this.sendHistory.set(contentId, {
          contentId,
          contentType: entry.emailType as ContentType,
          sentAt: entry.sentAt!,
          slot: this.inferSlotFromTime(entry.sentAt!),
          version: 1,
        })
      }
    }
  }
  
  /**
   * Route a single content item to the appropriate slot
   */
  routeContent(item: ContentItem, currentSlot: TimeSlot, now: Date = new Date()): RoutingDecision {
    const urgency = CONTENT_URGENCY[item.type]
    const preferredSlots = item.validSlots || PREFERRED_SLOTS[item.type] || ['midday']
    
    // Check freshness
    const freshnessHours = FRESHNESS_WINDOWS[urgency]
    const ageHours = (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60)
    
    if (ageHours > freshnessHours) {
      return {
        item,
        action: 'skip',
        targetSlot: currentSlot,
        reason: `Content too old (${ageHours.toFixed(1)}h > ${freshnessHours}h freshness window)`,
      }
    }
    
    // Check expiration
    if (item.expiresAt && item.expiresAt < now) {
      return {
        item,
        action: 'skip',
        targetSlot: currentSlot,
        reason: 'Content expired',
      }
    }
    
    // Urgent content: send immediately
    if (urgency === 'urgent' && item.priority >= 80) {
      return {
        item,
        action: 'send_immediate',
        targetSlot: 'immediate',
        reason: 'Urgent content with high priority',
      }
    }
    
    // Check deduplication
    const dedupResult = this.checkDeduplication(item, now)
    if (dedupResult.isDuplicate && !dedupResult.shouldUpdate) {
      return {
        item,
        action: 'skip',
        targetSlot: currentSlot,
        reason: `Already sent in ${dedupResult.previousSlot}: ${dedupResult.reason}`,
      }
    }
    
    // Time-sensitive: prefer specific slots
    if (urgency === 'time_sensitive') {
      if (preferredSlots.includes(currentSlot)) {
        return {
          item,
          action: 'include',
          targetSlot: currentSlot,
          reason: `Time-sensitive content for ${currentSlot} slot`,
        }
      }
      
      // Find next valid slot
      const nextSlot = this.getNextPreferredSlot(preferredSlots, currentSlot, now)
      if (nextSlot) {
        return {
          item,
          action: 'defer',
          targetSlot: nextSlot.slot,
          deferUntil: nextSlot.time,
          reason: `Deferring to preferred ${nextSlot.slot} slot`,
        }
      }
    }
    
    // Evergreen: include if slot has room
    if (urgency === 'evergreen') {
      return {
        item,
        action: 'include',
        targetSlot: currentSlot,
        reason: 'Evergreen content',
      }
    }
    
    // Batchable: defer to next slot or batch
    if (urgency === 'batchable') {
      const nextSlot = this.getNextSlot(currentSlot, now)
      return {
        item,
        action: 'defer',
        targetSlot: nextSlot.slot,
        deferUntil: nextSlot.time,
        reason: 'Batchable content deferred',
      }
    }
    
    // Default: include
    return {
      item,
      action: 'include',
      targetSlot: currentSlot,
      reason: 'Default routing',
    }
  }
  
  /**
   * Route multiple content items and build slot buckets
   */
  routeMultiple(
    items: ContentItem[], 
    targetSlot: TimeSlot, 
    now: Date = new Date()
  ): {
    include: RoutingDecision[]
    defer: RoutingDecision[]
    skip: RoutingDecision[]
    immediate: RoutingDecision[]
  } {
    const decisions = items.map(item => this.routeContent(item, targetSlot, now))
    
    return {
      include: decisions.filter(d => d.action === 'include'),
      defer: decisions.filter(d => d.action === 'defer'),
      skip: decisions.filter(d => d.action === 'skip'),
      immediate: decisions.filter(d => d.action === 'send_immediate'),
    }
  }
  
  /**
   * Build final content list for a slot with priority sorting and limits
   */
  buildSlotContent(
    decisions: RoutingDecision[],
    slot: TimeSlot
  ): {
    items: ContentItem[]
    dropped: ContentItem[]
    shouldSend: boolean
    skipReason?: string
  } {
    const limit = SLOT_LIMITS[slot]
    const minimum = SLOT_MINIMUMS[slot]
    
    // Sort by priority (highest first)
    const sorted = decisions
      .filter(d => d.action === 'include')
      .sort((a, b) => b.item.priority - a.item.priority)
    
    // Take up to limit
    const included = sorted.slice(0, limit)
    const dropped = sorted.slice(limit)
    
    // Check minimum threshold
    if (included.length < minimum) {
      return {
        items: [],
        dropped: sorted.map(d => d.item),
        shouldSend: false,
        skipReason: `Insufficient content (${included.length} < ${minimum} items)`,
      }
    }
    
    return {
      items: included.map(d => d.item),
      dropped: dropped.map(d => d.item),
      shouldSend: true,
    }
  }
  
  /**
   * Check if content was already sent (deduplication)
   */
  private checkDeduplication(
    item: ContentItem,
    now: Date
  ): {
    isDuplicate: boolean
    shouldUpdate: boolean
    previousSlot?: TimeSlot
    reason?: string
  } {
    // Check by content ID
    const historyEntry = this.sendHistory.get(item.id)
    if (!historyEntry) {
      // Also check by source ID if available
      if (item.sourceId) {
        for (const entry of this.sendHistory.values()) {
          if (entry.sourceId === item.sourceId) {
            return this.evaluateUpdate(item, entry, now)
          }
        }
      }
      return { isDuplicate: false, shouldUpdate: false }
    }
    
    return this.evaluateUpdate(item, historyEntry, now)
  }
  
  /**
   * Determine if an update to previously sent content warrants re-sending
   */
  private evaluateUpdate(
    item: ContentItem,
    previous: SendHistoryEntry,
    now: Date
  ): {
    isDuplicate: boolean
    shouldUpdate: boolean
    previousSlot?: TimeSlot
    reason: string
  } {
    const hoursSinceSent = (now.getTime() - previous.sentAt.getTime()) / (1000 * 60 * 60)
    
    // Changes that warrant a new email:
    const urgency = CONTENT_URGENCY[item.type]
    
    // 1. Urgent content that's been updated
    if (urgency === 'urgent' && item.priority >= 90) {
      return {
        isDuplicate: true,
        shouldUpdate: true,
        previousSlot: previous.slot,
        reason: 'Urgent update to previously sent content',
      }
    }
    
    // 2. Status changes (e.g., ASP suspended → in effect)
    if (this.isStatusChange(item, previous)) {
      return {
        isDuplicate: true,
        shouldUpdate: true,
        previousSlot: previous.slot,
        reason: 'Status change detected',
      }
    }
    
    // 3. Significant priority increase
    if (item.priority - 50 > 30) { // More than 30 point increase
      return {
        isDuplicate: true,
        shouldUpdate: true,
        previousSlot: previous.slot,
        reason: 'Significant priority escalation',
      }
    }
    
    // No update warranted
    return {
      isDuplicate: true,
      shouldUpdate: false,
      previousSlot: previous.slot,
      reason: `Sent ${hoursSinceSent.toFixed(1)} hours ago`,
    }
  }
  
  /**
   * Check if content represents a status change
   */
  private isStatusChange(item: ContentItem, previous: SendHistoryEntry): boolean {
    // ASP status changes
    if (
      (item.type === 'asp_in_effect' && previous.contentType === 'asp_suspension') ||
      (item.type === 'asp_suspension' && previous.contentType === 'asp_in_effect')
    ) {
      return true
    }
    
    // Transit status changes
    if (
      (item.type === 'transit_restoration' && previous.contentType === 'transit_outage') ||
      (item.type === 'transit_outage' && previous.contentType === 'transit_restoration')
    ) {
      return true
    }
    
    return false
  }
  
  /**
   * Get next preferred slot from current position
   */
  private getNextPreferredSlot(
    preferredSlots: TimeSlot[],
    currentSlot: TimeSlot,
    now: Date
  ): { slot: TimeSlot; time: Date } | null {
    const slotOrder: TimeSlot[] = ['morning', 'midday', 'evening']
    const currentIndex = slotOrder.indexOf(currentSlot)
    
    // Look forward in preferred slots
    for (const slot of preferredSlots) {
      const slotIndex = slotOrder.indexOf(slot)
      if (slotIndex > currentIndex) {
        return {
          slot,
          time: this.getSlotTime(slot, now),
        }
      }
    }
    
    // Wrap to tomorrow if needed
    if (preferredSlots[0]) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return {
        slot: preferredSlots[0],
        time: this.getSlotTime(preferredSlots[0], tomorrow),
      }
    }
    
    return null
  }
  
  /**
   * Get next slot in sequence
   */
  private getNextSlot(currentSlot: TimeSlot, now: Date): { slot: TimeSlot; time: Date } {
    const nextMap: Record<TimeSlot, TimeSlot> = {
      morning: 'midday',
      midday: 'evening',
      evening: 'morning',
    }
    
    const nextSlot = nextMap[currentSlot]
    let targetDate = new Date(now)
    
    // If wrapping to morning, advance to tomorrow
    if (nextSlot === 'morning') {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    
    return {
      slot: nextSlot,
      time: this.getSlotTime(nextSlot, targetDate),
    }
  }
  
  /**
   * Get the scheduled time for a slot
   */
  private getSlotTime(slot: TimeSlot, date: Date): Date {
    const result = new Date(date)
    result.setHours(SLOT_TIMES[slot], 0, 0, 0)
    return result
  }
  
  /**
   * Infer which slot a send time corresponds to
   */
  private inferSlotFromTime(sentAt: Date): TimeSlot {
    const hour = sentAt.getHours()
    
    if (hour < 11) return 'morning'
    if (hour < 16) return 'midday'
    return 'evening'
  }
  
  /**
   * Record that content was sent (for deduplication tracking)
   */
  recordSend(item: ContentItem, slot: TimeSlot): void {
    this.sendHistory.set(item.id, {
      contentId: item.id,
      contentType: item.type,
      sourceId: item.sourceId,
      sentAt: new Date(),
      slot,
      version: 1,
    })
  }
}

// =============================================================================
// SLOT-SPECIFIC CONTENT RULES
// =============================================================================

/**
 * Morning slot (9am) content rules
 * Focus: Commute preparation, parking status, transit alerts
 */
export function getMorningContentRules(): {
  required: ContentType[]
  preferred: ContentType[]
  excluded: ContentType[]
} {
  return {
    // Must have these if available
    required: ['asp_status', 'weather_daily'],
    
    // Good to have
    preferred: [
      'transit_delay',
      'transit_advisory',
      'weather_advisory',
      'event_reminder',
      'street_closure',
    ],
    
    // Skip these in morning
    excluded: ['weekly_recap', 'tips', 'neighborhood_update'],
  }
}

/**
 * Midday slot (12pm) content rules
 * Focus: Flexible, breaking news, updates
 */
export function getMiddayContentRules(): {
  required: ContentType[]
  preferred: ContentType[]
  excluded: ContentType[]
} {
  return {
    required: [],
    
    preferred: [
      'breaking_news',
      'local_news',
      'transit_delay',
      'transit_restoration',
      'weather_advisory',
    ],
    
    excluded: ['asp_tomorrow', 'weekly_recap'],
  }
}

/**
 * Evening slot (6pm) content rules
 * Focus: Tomorrow planning, day-ahead preview
 */
export function getEveningContentRules(): {
  required: ContentType[]
  preferred: ContentType[]
  excluded: ContentType[]
} {
  return {
    required: ['asp_tomorrow'],
    
    preferred: [
      'weather_advisory',
      'transit_advisory',
      'event_reminder',
      'local_news',
      'neighborhood_update',
    ],
    
    excluded: ['asp_status', 'asp_in_effect'], // Today's status is stale by evening
  }
}

// =============================================================================
// SCARCITY & ABUNDANCE RULES
// =============================================================================

/**
 * Handle content scarcity (not enough content for a slot)
 */
export function handleScarcity(
  slot: TimeSlot,
  availableItems: ContentItem[],
  now: Date
): {
  action: 'send' | 'skip' | 'combine_next'
  reason: string
  additionalContent?: ContentType[]
} {
  const minimum = SLOT_MINIMUMS[slot]
  const count = availableItems.length
  
  if (count >= minimum) {
    return { action: 'send', reason: 'Sufficient content' }
  }
  
  // Morning: always send if we have parking status
  if (slot === 'morning') {
    const hasParking = availableItems.some(i => 
      i.type.startsWith('asp_') || i.type === 'parking_emergency'
    )
    if (hasParking) {
      return { action: 'send', reason: 'Morning slot with parking status' }
    }
  }
  
  // Evening: always send if we have tomorrow's preview
  if (slot === 'evening') {
    const hasTomorrow = availableItems.some(i => i.type === 'asp_tomorrow')
    if (hasTomorrow) {
      return { action: 'send', reason: 'Evening slot with tomorrow preview' }
    }
  }
  
  // Midday: more aggressive skipping
  if (slot === 'midday') {
    if (count === 0) {
      return { action: 'skip', reason: 'No content for midday slot' }
    }
    
    // Check if any high-priority items
    const hasHighPriority = availableItems.some(i => i.priority >= 70)
    if (!hasHighPriority) {
      return { 
        action: 'combine_next', 
        reason: 'Low-priority content only, combining with evening' 
      }
    }
  }
  
  return { action: 'skip', reason: `Insufficient content (${count} < ${minimum})` }
}

/**
 * Handle content abundance (too much content for a slot)
 */
export function handleAbundance(
  slot: TimeSlot,
  items: ContentItem[]
): {
  keep: ContentItem[]
  defer: ContentItem[]
  drop: ContentItem[]
  reason: string
} {
  const limit = SLOT_LIMITS[slot]
  
  if (items.length <= limit) {
    return { keep: items, defer: [], drop: [], reason: 'Within limits' }
  }
  
  // Sort by priority
  const sorted = [...items].sort((a, b) => b.priority - a.priority)
  
  // Always keep urgent content
  const urgent = sorted.filter(i => CONTENT_URGENCY[i.type] === 'urgent')
  const remaining = sorted.filter(i => CONTENT_URGENCY[i.type] !== 'urgent')
  
  // Fill up to limit with urgent first
  const keep: ContentItem[] = urgent.slice(0, limit)
  const urgentOverflow = urgent.slice(limit)
  
  // Fill remaining slots with highest priority
  const slotsRemaining = limit - keep.length
  keep.push(...remaining.slice(0, slotsRemaining))
  
  // Categorize overflow
  const overflowItems = [...urgentOverflow, ...remaining.slice(slotsRemaining)]
  
  const defer: ContentItem[] = []
  const drop: ContentItem[] = []
  
  for (const item of overflowItems) {
    const urgency = CONTENT_URGENCY[item.type]
    
    // Batchable and evergreen can be deferred
    if (urgency === 'batchable' || urgency === 'evergreen') {
      defer.push(item)
    }
    // Time-sensitive might be stale by next slot
    else if (urgency === 'time_sensitive') {
      // Defer if high priority, otherwise drop
      if (item.priority >= 60) {
        defer.push(item)
      } else {
        drop.push(item)
      }
    }
    // Urgent overflow - send in separate immediate email
    else {
      defer.push(item)
    }
  }
  
  return {
    keep,
    defer,
    drop,
    reason: `Trimmed from ${items.length} to ${keep.length} items`,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Determine current slot based on time
 */
export function getCurrentSlot(now: Date = new Date()): TimeSlot {
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: DELIVERY_TIMEZONE }))
  const hour = etTime.getHours()
  
  if (hour < 11) return 'morning'
  if (hour < 16) return 'midday'
  return 'evening'
}

/**
 * Get time until next slot
 */
export function getTimeUntilNextSlot(now: Date = new Date()): {
  slot: TimeSlot
  msUntil: number
} {
  const currentSlot = getCurrentSlot(now)
  const slotOrder: TimeSlot[] = ['morning', 'midday', 'evening']
  const currentIndex = slotOrder.indexOf(currentSlot)
  const nextSlot = slotOrder[(currentIndex + 1) % 3]
  
  const nextTime = new Date(now)
  nextTime.setHours(SLOT_TIMES[nextSlot], 0, 0, 0)
  
  // If next slot is morning, it's tomorrow
  if (nextSlot === 'morning') {
    nextTime.setDate(nextTime.getDate() + 1)
  }
  
  return {
    slot: nextSlot,
    msUntil: nextTime.getTime() - now.getTime(),
  }
}

/**
 * Check if content is still fresh for a given slot
 */
export function isContentFresh(
  item: ContentItem,
  slot: TimeSlot,
  now: Date = new Date()
): boolean {
  const urgency = CONTENT_URGENCY[item.type]
  const maxAgeHours = FRESHNESS_WINDOWS[urgency]
  const ageMs = now.getTime() - item.createdAt.getTime()
  const ageHours = ageMs / (1000 * 60 * 60)
  
  return ageHours <= maxAgeHours
}

/**
 * Create a content item from raw data
 */
export function createContentItem(
  type: ContentType,
  data: {
    id: string
    title: string
    body?: string
    priority?: number
    sourceId?: string
    expiresAt?: Date
    validSlots?: TimeSlot[]
    metadata?: Record<string, unknown>
  }
): ContentItem {
  return {
    id: data.id,
    type,
    title: data.title,
    body: data.body,
    priority: data.priority ?? getDefaultPriority(type),
    createdAt: new Date(),
    expiresAt: data.expiresAt,
    validSlots: data.validSlots,
    sourceId: data.sourceId,
    metadata: data.metadata,
  }
}

/**
 * Get default priority for a content type
 */
function getDefaultPriority(type: ContentType): number {
  const priorities: Record<ContentType, number> = {
    // Highest priority (90+)
    parking_emergency: 95,
    weather_severe: 95,
    transit_outage: 90,
    breaking_news: 85,
    
    // High priority (70-89)
    asp_status: 80,
    asp_suspension: 80,
    asp_in_effect: 80,
    transit_delay: 75,
    weather_advisory: 70,
    
    // Medium priority (50-69)
    asp_tomorrow: 65,
    transit_advisory: 60,
    street_closure: 60,
    event_reminder: 55,
    weather_daily: 50,
    
    // Lower priority (30-49)
    local_news: 45,
    transit_restoration: 40,
    meter_status: 40,
    neighborhood_update: 35,
    
    // Lowest priority (<30)
    tips: 25,
    weekly_recap: 20,
    welcome: 50, // Special case
  }
  
  return priorities[type] ?? 50
}

// Export singleton instance
export const contentRouter = new ContentRouter()
