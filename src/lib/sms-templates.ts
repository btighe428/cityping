// SMS Message Templates
// Friendly/casual tone as per design spec

export const SMS_TEMPLATES = {
  // After checkout - request opt-in confirmation
  optIn: () =>
    `ParkPing here! Reply YES to start getting alerts. STOP to cancel, HELP for help.`,

  // After user replies YES
  confirmed: () =>
    `You're all set! We'll text you the evening before ASP suspensions. ` + String.fromCodePoint(0x1F697),

  // Night before suspension - main product moment
  reminder: (date: string, holidayName: string) => {
    const emoji = getHolidayEmoji(holidayName)
    return `Hey! Tomorrow's ${holidayName} — ASP is OFF. Sleep in, your car's fine. ${emoji}`
  },

  // Monthly recap - 1st of each month
  monthlyRecap: (
    monthName: string,
    suspensionCount: number,
    highlights: string[],
    nextMonthPreview?: string
  ) => {
    const highlightText = highlights.length > 0
      ? ` (${highlights.join(', ')})`
      : ''
    const preview = nextMonthPreview
      ? ` ${nextMonthPreview}`
      : ''
    return `ParkPing ${monthName} recap: ${suspensionCount} suspension day${suspensionCount !== 1 ? 's' : ''}${highlightText}.${preview} ` + String.fromCodePoint(0x1F697)
  },

  // Response to HELP keyword
  help: () =>
    `ParkPing: NYC parking alerts. Reply MANAGE for settings, STOP to cancel. Questions? support@parkping.com`,

  // Response to STOP keyword
  stopped: () =>
    `You've been unsubscribed from ParkPing. Reply START to resubscribe anytime.`,

  // Response to START/UNSTOP when subscription is active
  restarted: () =>
    `Welcome back! You'll receive ASP suspension alerts again. ` + String.fromCodePoint(0x1F697),

  // Response to START/UNSTOP when no active subscription
  noSubscription: () =>
    `To receive alerts, please subscribe at parkping.com`,

  // Response to MANAGE keyword - includes link
  manageLink: (url: string) =>
    `Manage your ParkPing settings: ${url} (link expires in 15 min)`,

  // Response to YES when already confirmed
  alreadyConfirmed: () =>
    `You're already set up! We'll text you before ASP suspensions.`,

  // Response to YES when subscription is not active
  subscriptionRequired: () =>
    `Your subscription isn't active. Visit parkping.com to resubscribe.`,
}

// Map holiday names to appropriate emojis
function getHolidayEmoji(holidayName: string): string {
  const name = holidayName.toLowerCase()

  if (name.includes('christmas')) return String.fromCodePoint(0x1F384) // Christmas tree
  if (name.includes('new year')) return String.fromCodePoint(0x1F389) // Party popper
  if (name.includes('thanksgiving')) return String.fromCodePoint(0x1F983) // Turkey
  if (name.includes('independence') || name.includes('july 4')) return String.fromCodePoint(0x1F386) // Fireworks
  if (name.includes('memorial')) return String.fromCodePoint(0x1F1FA, 0x1F1F8) // US flag
  if (name.includes('labor')) return String.fromCodePoint(0x1F477) // Construction worker
  if (name.includes('mlk') || name.includes('martin luther king')) return String.fromCodePoint(0x270A) // Raised fist
  if (name.includes('president')) return String.fromCodePoint(0x1F1FA, 0x1F1F8) // US flag
  if (name.includes('veteran')) return String.fromCodePoint(0x1F396) // Military medal
  if (name.includes('columbus') || name.includes('indigenous')) return String.fromCodePoint(0x1F30E) // Globe
  if (name.includes('easter')) return String.fromCodePoint(0x1F430) // Rabbit
  if (name.includes('snow') || name.includes('winter')) return String.fromCodePoint(0x2744) // Snowflake

  // Default car emoji
  return String.fromCodePoint(0x1F697)
}

export default SMS_TEMPLATES
