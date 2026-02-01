// SMS Message Templates
// Professional, concise tone — clear value in every character

export const SMS_TEMPLATES = {
  // After checkout - request opt-in confirmation
  optIn: () =>
    `CityPing: Reply YES to receive ASP suspension alerts before holidays. Reply STOP to cancel.`,

  // After user replies YES
  confirmed: () =>
    `Confirmed. You'll receive ASP alerts the evening before each suspension.`,

  // Night before suspension - main product moment
  reminder: (date: string, holidayName: string) => {
    const emoji = getHolidayEmoji(holidayName)
    return `Tomorrow (${date}): ASP suspended for ${holidayName}. No need to move your car. ${emoji}`
  },

  // Monthly recap - 1st of each month
  monthlyRecap: (
    monthName: string,
    suspensionCount: number,
    highlights: string[],
    nextMonthPreview?: string
  ) => {
    const highlightText = highlights.length > 0
      ? ` Notable: ${highlights.join(', ')}.`
      : ''
    const preview = nextMonthPreview
      ? ` ${nextMonthPreview}`
      : ''
    return `${monthName}: ${suspensionCount} ASP suspension day${suspensionCount !== 1 ? 's' : ''}.${highlightText}${preview}`
  },

  // Response to HELP keyword
  help: () =>
    `CityPing sends ASP suspension alerts for NYC. Reply MANAGE for settings, STOP to unsubscribe, START to resubscribe.`,

  // Response to STOP keyword
  stopped: () =>
    `Unsubscribed. To resume alerts, reply START or visit cityping.net.`,

  // Response to START/UNSTOP when subscription is active
  restarted: () =>
    `Alerts resumed. You'll receive notifications before ASP suspensions.`,

  // Response to START/UNSTOP when no active subscription
  noSubscription: () =>
    `Visit cityping.net to activate your subscription.`,

  // Response to MANAGE keyword - includes link
  manageLink: (url: string) =>
    `Manage settings: ${url} (expires in 15 min)`,

  // Response to YES when already confirmed
  alreadyConfirmed: () =>
    `Your alerts are active. You'll be notified before ASP suspensions.`,

  // Response to YES when subscription is not active
  subscriptionRequired: () =>
    `Subscription required. Visit cityping.net to activate.`,
}

// Map holiday names to appropriate emojis
function getHolidayEmoji(holidayName: string): string {
  const name = holidayName.toLowerCase()

  if (name.includes('christmas')) return String.fromCodePoint(0x1F384)
  if (name.includes('new year')) return String.fromCodePoint(0x1F389)
  if (name.includes('thanksgiving')) return String.fromCodePoint(0x1F983)
  if (name.includes('independence') || name.includes('july 4')) return String.fromCodePoint(0x1F386)
  if (name.includes('memorial')) return String.fromCodePoint(0x1F1FA, 0x1F1F8)
  if (name.includes('labor')) return String.fromCodePoint(0x1F477)
  if (name.includes('mlk') || name.includes('martin luther king')) return String.fromCodePoint(0x270A)
  if (name.includes('president')) return String.fromCodePoint(0x1F1FA, 0x1F1F8)
  if (name.includes('veteran')) return String.fromCodePoint(0x1F396)
  if (name.includes('columbus') || name.includes('indigenous')) return String.fromCodePoint(0x1F30E)
  if (name.includes('easter')) return String.fromCodePoint(0x1F430)
  if (name.includes('snow') || name.includes('winter')) return String.fromCodePoint(0x2744)

  return String.fromCodePoint(0x1F697)
}

export default SMS_TEMPLATES
