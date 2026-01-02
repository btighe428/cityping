import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAndParseIcs } from '@/lib/ics'

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not set - allowing request in development')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sources = await prisma.calendarSource.findMany({
      where: { isActive: true },
      include: { city: true },
    })

    const results = []

    for (const source of sources) {
      try {
        const result = await fetchAndParseIcs(
          source.sourceUrl,
          source.city.timezone,
          source.etag,
          source.lastModified
        )

        // Always update last fetched time
        await prisma.calendarSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date() },
        })

        if (!result.changed) {
          results.push({
            sourceId: source.id,
            city: source.city.slug,
            status: 'unchanged',
          })
          continue
        }

        // Update source metadata
        await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            etag: result.etag,
            lastModified: result.lastModified,
            rawHash: result.rawHash,
            lastParsedAt: new Date(),
          },
        })

        // Upsert events
        let upsertedCount = 0
        for (const event of result.events) {
          // Use explicit UTC noon to avoid timezone shifts when storing dates
          const eventDate = new Date(event.date + 'T12:00:00.000Z')
          await prisma.suspensionEvent.upsert({
            where: {
              cityId_date_summary: {
                cityId: source.cityId,
                date: eventDate,
                summary: event.summary || 'ASP Suspended',
              },
            },
            update: {
              lastSeenAt: new Date(),
              eventUid: event.uid,
              rawStart: event.rawStart,
              rawEnd: event.rawEnd,
            },
            create: {
              cityId: source.cityId,
              sourceId: source.id,
              date: eventDate,
              summary: event.summary || 'ASP Suspended',
              eventUid: event.uid,
              rawStart: event.rawStart,
              rawEnd: event.rawEnd,
            },
          })
          upsertedCount++
        }

        results.push({
          sourceId: source.id,
          city: source.city.slug,
          status: 'updated',
          eventsCount: upsertedCount,
        })
      } catch (error) {
        console.error(`Failed to process source ${source.id}:`, error)
        results.push({
          sourceId: source.id,
          city: source.city.slug,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('Calendar refresh job error:', error)
    return NextResponse.json(
      { error: 'Job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
