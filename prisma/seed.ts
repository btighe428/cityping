import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create NYC city
  const nyc = await prisma.city.upsert({
    where: { slug: 'nyc' },
    update: {},
    create: {
      slug: 'nyc',
      name: 'New York City',
      timezone: 'America/New_York',
      defaultSendTimeLocal: '18:00',
    },
  })

  console.log(`Created city: ${nyc.name} (${nyc.slug})`)

  // Create calendar source for NYC ASP
  // NYC DOT publishes alternate side parking calendars
  // The ICS URL may need to be discovered or updated annually
  const calendarSource = await prisma.calendarSource.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001', // Fixed ID for upsert
    },
    update: {
      sourceUrl: 'https://www.nyc.gov/assets/dca/downloads/ics/alternate-side-parking.ics',
      isActive: true,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      cityId: nyc.id,
      sourceType: 'ics',
      discoverUrl: 'https://www.nyc.gov/html/dot/html/motorist/scrintro.shtml',
      sourceUrl: 'https://www.nyc.gov/assets/dca/downloads/ics/alternate-side-parking.ics',
      isActive: true,
    },
  })

  console.log(`Created calendar source: ${calendarSource.sourceUrl}`)

  // Official NYC 2025 ASP Suspension Calendar
  const sampleEvents = [
    // January
    { date: '2025-01-01', summary: "New Year's Day" },
    { date: '2025-01-06', summary: "Three Kings' Day" },
    { date: '2025-01-20', summary: "Martin Luther King, Jr.'s Birthday" },
    { date: '2025-01-28', summary: "Lunar New Year's Eve" },
    { date: '2025-01-29', summary: "Lunar New Year" },
    // February
    { date: '2025-02-12', summary: "Lincoln's Birthday" },
    { date: '2025-02-17', summary: "Washington's Birthday (Presidents Day)" },
    { date: '2025-02-28', summary: "Losar" },
    // March
    { date: '2025-03-05', summary: "Ash Wednesday" },
    { date: '2025-03-14', summary: "Purim" },
    { date: '2025-03-31', summary: "Idul-Fitr (Eid Al-Fitr)" },
    // April
    { date: '2025-04-01', summary: "Idul-Fitr (Eid Al-Fitr)" },
    { date: '2025-04-13', summary: "Passover" },
    { date: '2025-04-14', summary: "Passover" },
    { date: '2025-04-17', summary: "Holy Thursday" },
    { date: '2025-04-18', summary: "Good Friday" },
    { date: '2025-04-19', summary: "Passover (7th Day)" },
    { date: '2025-04-20', summary: "Passover (8th Day)" },
    // May
    { date: '2025-05-26', summary: "Memorial Day" },
    { date: '2025-05-29', summary: "Solemnity of the Ascension" },
    // June
    { date: '2025-06-02', summary: "Shavuoth" },
    { date: '2025-06-03', summary: "Shavuoth" },
    { date: '2025-06-06', summary: "Idul-Adha (Eid Al-Adha)" },
    { date: '2025-06-07', summary: "Idul-Adha (Eid Al-Adha)" },
    { date: '2025-06-19', summary: "Juneteenth" },
    // July
    { date: '2025-07-04', summary: "Independence Day" },
    // August
    { date: '2025-08-03', summary: "Tisha B'Av" },
    { date: '2025-08-15', summary: "Feast of the Assumption" },
    // September
    { date: '2025-09-01', summary: "Labor Day" },
    { date: '2025-09-23', summary: "Rosh Hashanah" },
    { date: '2025-09-24', summary: "Rosh Hashanah" },
    // October
    { date: '2025-10-02', summary: "Yom Kippur" },
    { date: '2025-10-07', summary: "Succoth" },
    { date: '2025-10-08', summary: "Succoth" },
    { date: '2025-10-13', summary: "Columbus Day" },
    { date: '2025-10-14', summary: "Shemini Atzereth" },
    { date: '2025-10-15', summary: "Simchas Torah" },
    { date: '2025-10-20', summary: "Diwali" },
    // November
    { date: '2025-11-01', summary: "All Saints' Day" },
    { date: '2025-11-04', summary: "Election Day" },
    { date: '2025-11-11', summary: "Veterans Day" },
    { date: '2025-11-27', summary: "Thanksgiving Day" },
    // December
    { date: '2025-12-08', summary: "Immaculate Conception" },
    { date: '2025-12-25', summary: "Christmas Day" },
  ]

  for (const event of sampleEvents) {
    // Use explicit UTC time to avoid timezone shifts
    const eventDate = new Date(event.date + 'T12:00:00.000Z')
    await prisma.suspensionEvent.upsert({
      where: {
        cityId_date_summary: {
          cityId: nyc.id,
          date: eventDate,
          summary: event.summary,
        },
      },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        cityId: nyc.id,
        sourceId: calendarSource.id,
        date: eventDate,
        summary: event.summary,
        lastSeenAt: new Date(),
      },
    })
  }

  console.log(`Created ${sampleEvents.length} sample suspension events`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
