// scripts/check-events-and-citibike.ts
// Check CityEvents and find nearest CitiBike station to an address

import { prisma } from "../src/lib/db";

async function main() {
  // Check CityEvents count
  const eventCount = await prisma.cityEvent.count();
  console.log(`\n=== CityEvents: ${eventCount} total ===`);

  // Get sample events
  const sampleEvents = await prisma.cityEvent.findMany({
    take: 5,
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      sourceName: true,
    },
  });

  if (sampleEvents.length > 0) {
    console.log("\nRecent events:");
    for (const e of sampleEvents) {
      console.log(`  - ${e.title} (${e.sourceName}) - ${e.startsAt?.toLocaleDateString()}`);
    }
  }

  // Check CitiBike stations count
  const stationCount = await prisma.citiBikeStation.count();
  console.log(`\n=== CitiBike Stations: ${stationCount} total ===`);

  // 319 Schermerhorn St, Brooklyn coordinates (approximate)
  // This is near Barclays Center / Downtown Brooklyn
  const targetLat = 40.6876;
  const targetLon = -73.9834;

  // Find nearest stations
  const stations = await prisma.citiBikeStation.findMany({
    where: {
      neighborhood: "Brooklyn",
    },
    take: 100,
  });

  // Calculate distances
  const withDistances = stations.map((s) => ({
    ...s,
    distance: Math.sqrt(
      Math.pow(s.lat - targetLat, 2) + Math.pow(s.lon - targetLon, 2)
    ),
  }));

  withDistances.sort((a, b) => a.distance - b.distance);

  console.log("\nNearest CitiBike stations to 319 Schermerhorn St, Brooklyn:");
  for (const s of withDistances.slice(0, 5)) {
    console.log(`  - ${s.name} (ID: ${s.stationId})`);
    console.log(`    ${s.bikesAvailable} bikes, ${s.docksAvailable} docks available`);
  }

  // Find first real user to add saved location
  const nearestStation = withDistances[0];
  if (nearestStation) {
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true },
    });

    if (firstUser) {
      console.log(`\n=== Creating saved location for ${firstUser.email} ===`);
      console.log(`Station: ${nearestStation.name} (${nearestStation.stationId})`);

      await prisma.userSavedLocation.upsert({
        where: {
          userId_locationType: {
            userId: firstUser.id,
            locationType: "citibike_home",
          },
        },
        update: {
          stationId: nearestStation.stationId,
        },
        create: {
          userId: firstUser.id,
          locationType: "citibike_home",
          stationId: nearestStation.stationId,
        },
      });

      console.log("✅ Saved home station");
      console.log(`\nTo send test email with CitiBike section, use this user ID: ${firstUser.id}`);
    } else {
      console.log("\n⚠️ No users found in database. Create a user first.");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
