// NYC Weather Forecast Module
// Uses the National Weather Service (NWS) API - free, no API key required
// Provides 7-day forecasts with precipitation data

import { DateTime } from 'luxon'

// NWS grid coordinates for Central Park, NYC
// Pre-computed from: https://api.weather.gov/points/40.7829,-73.9654
const NYC_NWS_OFFICE = 'OKX'  // Upton, NY office covers NYC
const NYC_GRID_X = 33
const NYC_GRID_Y = 37

const NWS_FORECAST_URL = `https://api.weather.gov/gridpoints/${NYC_NWS_OFFICE}/${NYC_GRID_X},${NYC_GRID_Y}/forecast`

export interface DayForecast {
  date: string
  dayOfWeek: string
  name: string  // "Monday Night", "Tuesday", etc.
  temperature: number
  temperatureUnit: string
  shortForecast: string
  detailedForecast: string
  probabilityOfPrecipitation: number | null
  snowAmount: {
    hasSnow: boolean
    description: string | null
    estimatedInches: number | null
  }
}

export interface WeeklyWeatherForecast {
  fetchedAt: Date
  days: DayForecast[]
  snowDays: DayForecast[]
  hasSignificantSnow: boolean  // Any day with >0.5 inches expected
  snowSummary: string | null
}

// Parse snow amount from NWS forecast text
// NWS uses phrases like "1 to 3 inches", "dusting", "accumulation up to 2 inches"
function parseSnowAmount(forecastText: string): { hasSnow: boolean; description: string | null; estimatedInches: number | null } {
  const text = forecastText.toLowerCase()

  // Check for snow mentions
  const snowKeywords = ['snow', 'flurries', 'wintry mix', 'sleet', 'freezing rain']
  const hasSnowMention = snowKeywords.some(kw => text.includes(kw))

  if (!hasSnowMention) {
    return { hasSnow: false, description: null, estimatedInches: null }
  }

  // Extract snow accumulation amounts
  // Patterns: "1 to 3 inches", "2-4 inches", "up to 6 inches", "around 1 inch"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*inch/i,  // "1 to 3 inches" or "2-4 inches"
    /up to (\d+(?:\.\d+)?)\s*inch/i,  // "up to 6 inches"
    /around (\d+(?:\.\d+)?)\s*inch/i,  // "around 1 inch"
    /(\d+(?:\.\d+)?)\s*inch/i,  // "3 inches"
    /(?:dusting|coating)/i,  // Light snow
    /(?:trace|light snow)/i,  // Very light
  ]

  let estimatedInches: number | null = null
  let description: string | null = null

  // Try range pattern first (e.g., "1 to 3 inches")
  const rangeMatch = text.match(patterns[0])
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1])
    const high = parseFloat(rangeMatch[2])
    estimatedInches = (low + high) / 2  // Use midpoint
    description = `${low}-${high} inches`
  }

  // Try "up to X inches"
  if (!estimatedInches) {
    const upToMatch = text.match(patterns[1])
    if (upToMatch) {
      estimatedInches = parseFloat(upToMatch[1]) * 0.75  // Conservative estimate
      description = `up to ${upToMatch[1]} inches`
    }
  }

  // Try "around X inches"
  if (!estimatedInches) {
    const aroundMatch = text.match(patterns[2])
    if (aroundMatch) {
      estimatedInches = parseFloat(aroundMatch[1])
      description = `around ${aroundMatch[1]} inches`
    }
  }

  // Try simple "X inches"
  if (!estimatedInches) {
    const simpleMatch = text.match(patterns[3])
    if (simpleMatch) {
      estimatedInches = parseFloat(simpleMatch[1])
      description = `${simpleMatch[1]} inches`
    }
  }

  // Check for trace/dusting
  if (!estimatedInches && (text.includes('dusting') || text.includes('coating'))) {
    estimatedInches = 0.25
    description = 'dusting'
  }

  if (!estimatedInches && (text.includes('trace') || text.includes('light snow'))) {
    estimatedInches = 0.1
    description = 'trace amounts'
  }

  // If snow mentioned but no amount, assume light snow
  if (!estimatedInches && hasSnowMention) {
    estimatedInches = 0.25
    description = 'possible snow'
  }

  return {
    hasSnow: true,
    description,
    estimatedInches,
  }
}

// Fetch 7-day weather forecast for NYC
export async function fetchNYCWeatherForecast(): Promise<WeeklyWeatherForecast | null> {
  try {
    const response = await fetch(NWS_FORECAST_URL, {
      headers: {
        'User-Agent': 'CityPing Weather Service (cityping.net)',
        'Accept': 'application/geo+json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch NWS forecast:', response.status)
      return null
    }

    const data = await response.json()
    const periods = data.properties?.periods || []

    const days: DayForecast[] = []
    const timezone = 'America/New_York'

    for (const period of periods) {
      // Parse the start time to get the date
      const startTime = DateTime.fromISO(period.startTime, { zone: timezone })
      const snowInfo = parseSnowAmount(period.detailedForecast || period.shortForecast || '')

      days.push({
        date: startTime.toISODate()!,
        dayOfWeek: startTime.toFormat('EEEE'),
        name: period.name,
        temperature: period.temperature,
        temperatureUnit: period.temperatureUnit,
        shortForecast: period.shortForecast,
        detailedForecast: period.detailedForecast,
        probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value || null,
        snowAmount: snowInfo,
      })
    }

    // Filter to days with snow
    const snowDays = days.filter(d => d.snowAmount.hasSnow)

    // Check for significant snow (>0.5 inches on any day)
    const hasSignificantSnow = snowDays.some(
      d => (d.snowAmount.estimatedInches || 0) >= 0.5
    )

    // Generate snow summary
    let snowSummary: string | null = null
    if (snowDays.length > 0) {
      const maxSnow = Math.max(...snowDays.map(d => d.snowAmount.estimatedInches || 0))
      const snowDayNames = [...new Set(snowDays.map(d => d.dayOfWeek))]

      if (hasSignificantSnow) {
        snowSummary = `⚠️ Snow in the forecast: ${snowDayNames.join(', ')} (up to ${maxSnow.toFixed(1)} inches expected)`
      } else {
        snowSummary = `Light snow possible: ${snowDayNames.join(', ')}`
      }
    }

    return {
      fetchedAt: new Date(),
      days,
      snowDays,
      hasSignificantSnow,
      snowSummary,
    }
  } catch (error) {
    console.error('Error fetching NYC weather forecast:', error)
    return null
  }
}

// Get snow forecast for a specific date range
export async function getSnowForecastForWeek(startDate: string, endDate: string): Promise<{
  hasSnow: boolean
  hasSignificantSnow: boolean
  snowDays: Array<{ date: string; dayOfWeek: string; description: string | null; estimatedInches: number | null }>
  summary: string | null
}> {
  const forecast = await fetchNYCWeatherForecast()

  if (!forecast) {
    return {
      hasSnow: false,
      hasSignificantSnow: false,
      snowDays: [],
      summary: null,
    }
  }

  const start = DateTime.fromISO(startDate)
  const end = DateTime.fromISO(endDate)

  // Filter snow days to the requested date range
  const relevantSnowDays = forecast.snowDays.filter(d => {
    const dayDate = DateTime.fromISO(d.date)
    return dayDate >= start && dayDate <= end
  })

  const hasSnow = relevantSnowDays.length > 0
  const hasSignificantSnow = relevantSnowDays.some(
    d => (d.snowAmount.estimatedInches || 0) >= 0.5
  )

  let summary: string | null = null
  if (hasSignificantSnow) {
    const snowDayNames = [...new Set(relevantSnowDays.map(d => d.dayOfWeek))]
    const maxSnow = Math.max(...relevantSnowDays.map(d => d.snowAmount.estimatedInches || 0))
    summary = `Snow forecast: ${snowDayNames.join(', ')} (${maxSnow >= 1 ? `${maxSnow.toFixed(0)}+ inches` : `up to ${maxSnow.toFixed(1)} inches`})`
  } else if (hasSnow) {
    const snowDayNames = [...new Set(relevantSnowDays.map(d => d.dayOfWeek))]
    summary = `Light snow possible: ${snowDayNames.join(', ')}`
  }

  return {
    hasSnow,
    hasSignificantSnow,
    snowDays: relevantSnowDays.map(d => ({
      date: d.date,
      dayOfWeek: d.dayOfWeek,
      description: d.snowAmount.description,
      estimatedInches: d.snowAmount.estimatedInches,
    })),
    summary,
  }
}
