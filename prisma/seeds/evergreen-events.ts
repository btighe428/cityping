// prisma/seeds/evergreen-events.ts
/**
 * Evergreen NYC Events Seed Data
 *
 * Pre-loaded annual events that recur each year. The AI monitors for
 * official date announcements and creates CityEvent instances.
 *
 * Each event includes:
 * - Typical timing (when it usually happens)
 * - Insider context (local wisdom)
 * - Pro tips (what savvy New Yorkers know)
 * - Anticipation days (when to notify users)
 */

import { PrismaClient, EventCategory } from "@prisma/client";

const prisma = new PrismaClient();

export interface EvergreenEventSeed {
  name: string;
  typicalDate: string;
  typicalTime?: string;
  category: EventCategory;
  insiderContext: string;
  tips: string[];
  anticipationDays: number[];
  sources: string[];
}

export const EVERGREEN_EVENTS: EvergreenEventSeed[] = [
  // ============================================================================
  // SEASONAL / HOLIDAYS
  // ============================================================================
  {
    name: "Rockefeller Center Tree Lighting",
    typicalDate: "Wednesday after Thanksgiving",
    typicalTime: "7pm",
    category: "seasonal",
    insiderContext:
      "Skip the crowds at the lighting ceremony - the tree stays lit through early January. Best viewing: weekday 6am, empty plaza, coffee from Joe's across the street.",
    tips: [
      "Tree stays lit until early January - no need to brave the crowds",
      "Weekday mornings before 7am are empty",
      "The Lego store nearby opens early for tree viewers",
    ],
    anticipationDays: [30, 7, 1],
    sources: ["https://www.rockefellercenter.com"],
  },
  {
    name: "Macy's Thanksgiving Day Parade",
    typicalDate: "Fourth Thursday of November",
    typicalTime: "9am",
    category: "seasonal",
    insiderContext:
      "Best views: 77th & Central Park West. Arrive by 7am. Pro tip: bathrooms at the Museum of Natural History, which opens at 10am but lets parade viewers use facilities.",
    tips: [
      "77th & CPW has the best balloon views as they turn",
      "Museum of Natural History opens bathrooms for parade goers",
      "Bring hand warmers and a thermos - it's always colder than you think",
      "Skip Herald Square unless you want to be on TV",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.macys.com/parade"],
  },
  {
    name: "Times Square New Year's Eve",
    typicalDate: "December 31",
    typicalTime: "6pm gathering, midnight ball drop",
    category: "seasonal",
    insiderContext:
      "Locals avoid Times Square entirely. Better alternatives: Brooklyn Bridge views, rooftop parties, or literally any bar not in Midtown. If you must go, no bathrooms for 6+ hours.",
    tips: [
      "No re-entry once you're in the pens",
      "No bathrooms, no food vendors inside",
      "Wear adult diapers (seriously, people do)",
      "Brooklyn has better fireworks views",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.timessquarenyc.org"],
  },
  {
    name: "NYC Pride March",
    typicalDate: "Last Sunday of June",
    typicalTime: "12pm",
    category: "seasonal",
    insiderContext:
      "The march goes down 5th Ave to Greenwich Village. Best viewing: grab brunch at a Village restaurant with outdoor seating. The after-parties are the real event.",
    tips: [
      "Village restaurants book up months ahead - reserve now",
      "The Pier parties require advance tickets",
      "Subway is packed - walk or bike",
      "Wear sunscreen, it's always hotter than expected",
    ],
    anticipationDays: [30, 14, 7, 1],
    sources: ["https://www.nycpride.org"],
  },
  {
    name: "Fourth of July Fireworks (Macy's)",
    typicalDate: "July 4",
    typicalTime: "9:25pm",
    category: "seasonal",
    insiderContext:
      "Location changes yearly - usually East River. Skip the official viewing areas. Best spots: rooftops in Williamsburg, Long Island City waterfront, or any east-facing Manhattan rooftop.",
    tips: [
      "Location announced ~2 weeks before",
      "FDR closes - get to viewing spots by 7pm",
      "Williamsburg waterfront fills by 8pm",
      "Bring a radio for synchronized music",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.macys.com/fireworks"],
  },
  {
    name: "Chinese New Year Parade",
    typicalDate: "First Sunday after Lunar New Year",
    typicalTime: "1pm",
    category: "seasonal",
    insiderContext:
      "Chinatown becomes magical. The parade is fun but the real experience is dim sum before (arrive by 10am) and exploring the firecracker debris after.",
    tips: [
      "Dim sum spots fill by 11am - go early",
      "Mott Street has the best firecracker action",
      "Wear red for luck",
      "Golden Unicorn and Jing Fong for group dim sum",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.betterchinatown.com"],
  },
  {
    name: "St. Patrick's Day Parade",
    typicalDate: "March 17 (or nearest weekday)",
    typicalTime: "11am",
    category: "seasonal",
    insiderContext:
      "5th Avenue from 44th to 79th. Extremely crowded. Locals either embrace the chaos (Irish pubs open at 8am) or flee the city entirely.",
    tips: [
      "McSorley's line starts at 6am",
      "Upper East Side viewing is less chaotic",
      "Subway is a nightmare - walk or don't go",
      "Everything Irish books up months ahead",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.nycstpatricksparade.org"],
  },
  {
    name: "Three Kings Day Parade",
    typicalDate: "First Sunday after January 6",
    typicalTime: "12pm",
    category: "seasonal",
    insiderContext:
      "El Barrio (East Harlem) comes alive. One of the oldest Latino traditions in NYC. Live camels walk down 116th Street. Authentic, not touristy.",
    tips: [
      "106th to 116th on 3rd Ave",
      "Actual camels, sheep, and donkeys",
      "Stop at a lechonera after for roast pork",
      "One of the most authentic NYC cultural events",
    ],
    anticipationDays: [7, 1],
    sources: ["https://www.elmuseo.org"],
  },

  // ============================================================================
  // SPORTS
  // ============================================================================
  {
    name: "NYC Marathon",
    typicalDate: "First Sunday of November",
    typicalTime: "8am start",
    category: "sports",
    insiderContext:
      "26.2 miles through all 5 boroughs, 50k+ runners. Best spectating: First Ave (mile 16) where runners hit 'the wall', or the finish line in Central Park.",
    tips: [
      "Mile 16 on First Ave has the most drama",
      "Brooklyn's 4th Ave has great crowd energy",
      "Bagel shops along route are packed",
      "Lottery opens in January, closes in February",
    ],
    anticipationDays: [60, 30, 7, 1],
    sources: ["https://www.nyrr.org/tcsnycmarathon"],
  },
  {
    name: "Brooklyn Half Marathon",
    typicalDate: "Third Saturday of May",
    typicalTime: "7am",
    category: "sports",
    insiderContext:
      "Starts at the Brooklyn Museum, finishes on the Coney Island boardwalk. One of the best urban halfs in the country. Registration sells out in hours.",
    tips: [
      "Registration opens in January - set an alarm",
      "Sells out in hours, sometimes minutes",
      "Finish with a Nathan's hot dog",
      "Beach is empty at 10am when runners finish",
    ],
    anticipationDays: [90, 30, 7],
    sources: ["https://www.nyrr.org"],
  },
  {
    name: "US Open Tennis",
    typicalDate: "Last Monday of August through first Sunday of September",
    typicalTime: "11am daily",
    category: "sports",
    insiderContext:
      "Grounds pass is the best deal in tennis - access to all courts except Ashe. Watch future stars on Court 17. The Honey Deuce cocktail is overpriced but mandatory.",
    tips: [
      "Grounds pass = access to 16 courts",
      "Arthur Ashe is overrated - outer courts have better tennis",
      "Court 17 is where you spot future stars",
      "Night sessions have the best atmosphere",
    ],
    anticipationDays: [60, 30, 14, 1],
    sources: ["https://www.usopen.org"],
  },
  {
    name: "Yankees Opening Day",
    typicalDate: "Late March / Early April",
    typicalTime: "1pm or 7pm",
    category: "sports",
    insiderContext:
      "Bleacher Creatures in Section 203 do roll call. The 4 train is packed. Stan's Sports Bar across the street has better food than the stadium.",
    tips: [
      "Section 203 for the Bleacher Creatures experience",
      "Stan's Sports Bar pre-game is a tradition",
      "4 train from Grand Central gets mobbed",
      "Bring layers - April weather is unpredictable",
    ],
    anticipationDays: [30, 7, 1],
    sources: ["https://www.mlb.com/yankees"],
  },
  {
    name: "Mets Opening Day",
    typicalDate: "Late March / Early April",
    typicalTime: "1pm or 7pm",
    category: "sports",
    insiderContext:
      "Citi Field is easier to get to than Yankee Stadium. The 7 train from Manhattan is a party. Pat LaFrieda steak sandwich is the move.",
    tips: [
      "7 train from Times Square is the way",
      "Pat LaFrieda steak sandwich, not hot dogs",
      "Shake Shack line is insane - go early",
      "Rooftop bars in LIC have stadium views",
    ],
    anticipationDays: [30, 7, 1],
    sources: ["https://www.mlb.com/mets"],
  },

  // ============================================================================
  // CULTURE & MUSEUMS
  // ============================================================================
  {
    name: "MoMA Free Fridays",
    typicalDate: "Every Friday",
    typicalTime: "5:30pm - 9pm",
    category: "culture",
    insiderContext:
      "Free entry every Friday evening. Most tourists don't know this. Go at 7pm - the 5:30 rush clears out. Grab a martini at Terrace 5 bar after.",
    tips: [
      "5:30pm is mobbed - arrive at 7pm",
      "Terrace 5 bar has great views",
      "Skip the permanent collection, hit special exhibits",
      "Film screenings often included",
    ],
    anticipationDays: [7],
    sources: ["https://www.moma.org"],
  },
  {
    name: "Met Museum Pay-What-You-Wish",
    typicalDate: "Every day (for NY residents)",
    typicalTime: "10am - 5pm",
    category: "culture",
    insiderContext:
      "NY State residents can pay any amount. The suggested $30 is just that - suggested. $1 is fine. The rooftop bar opens in May with Central Park views.",
    tips: [
      "Pay what you wish for NYS residents",
      "Show any NY ID at the desk",
      "Rooftop bar (May-Oct) has the best views in the city",
      "Friday/Saturday open until 9pm",
    ],
    anticipationDays: [],
    sources: ["https://www.metmuseum.org"],
  },
  {
    name: "Shakespeare in the Park",
    typicalDate: "June through August",
    typicalTime: "8pm performances",
    category: "culture",
    insiderContext:
      "Free tickets via lottery at 12pm day-of, or line up at Central Park by 6am. Virtual lottery is easier. Bring a picnic and wine (technically not allowed, universally done).",
    tips: [
      "In-person line by 6am, or enter virtual lottery",
      "Bring a blanket and picnic",
      "Wine in an opaque bottle is tradition",
      "Delacorte Theater has no bad seats",
    ],
    anticipationDays: [30, 14, 7],
    sources: ["https://publictheater.org"],
  },
  {
    name: "Museum Mile Festival",
    typicalDate: "Second Tuesday of June",
    typicalTime: "6pm - 9pm",
    category: "culture",
    insiderContext:
      "Nine museums free for one night. Fifth Avenue closes to cars. Start at the Guggenheim (furthest north) and work your way down to avoid crowds.",
    tips: [
      "Start at 105th (Museo del Barrio) and walk down",
      "Guggenheim line gets long - go first or skip",
      "Street performances between museums",
      "The Met is free anyway - skip for others",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.museummilefestival.org"],
  },
  {
    name: "Tribeca Film Festival",
    typicalDate: "Mid-April",
    typicalTime: "Various",
    category: "culture",
    insiderContext:
      "Robert De Niro's festival. Mix of premieres and indie films. The free outdoor screenings are the best value. Hub is around Spring Street.",
    tips: [
      "Free outdoor screenings don't require tickets",
      "Industry panels are often open to public",
      "Tribeca restaurants offer fest specials",
      "Book restaurants early - neighborhood gets slammed",
    ],
    anticipationDays: [30, 14, 7],
    sources: ["https://www.tribecafilm.com"],
  },
  {
    name: "Open House New York",
    typicalDate: "Third weekend of October",
    typicalTime: "Various (mostly 10am-5pm)",
    category: "culture",
    insiderContext:
      "200+ buildings open their doors - places you'd never see otherwise. Registration opens ~3 weeks before and popular sites fill in hours. Set calendar reminders.",
    tips: [
      "Registration sells out in hours for popular sites",
      "Mark your calendar for registration day",
      "Have backup choices - competition is fierce",
      "Some walk-up only sites have shorter lines",
    ],
    anticipationDays: [30, 21, 7, 1],
    sources: ["https://www.ohny.org"],
  },
  {
    name: "Lincoln Center Summer Programs",
    typicalDate: "June through August",
    typicalTime: "Various",
    category: "culture",
    insiderContext:
      "Free concerts, dance, and performances all summer. The atrium hosts free shows at 12:30pm most days. Midsummer Night Swing is outdoor dancing with live bands.",
    tips: [
      "Damrosch Park for outdoor films",
      "Midsummer Night Swing for dancing",
      "12:30pm atrium concerts are free",
      "Bring lawn chairs for outdoor events",
    ],
    anticipationDays: [14, 7],
    sources: ["https://www.lincolncenter.org"],
  },

  // ============================================================================
  // FOOD & DRINK
  // ============================================================================
  {
    name: "NYC Restaurant Week",
    typicalDate: "Late January and late July",
    typicalTime: "Lunch and dinner",
    category: "food",
    insiderContext:
      "Prix fixe at top restaurants. $30 lunch, $45 dinner (prices vary). Some restaurants phone it in, others offer real value. Check Eater's guide for which are worth it.",
    tips: [
      "Book the first day reservations open",
      "Lunch is better value than dinner",
      "Check Eater's list for which restaurants actually try",
      "Avoid Fridays - kitchens are slammed",
    ],
    anticipationDays: [30, 14, 7],
    sources: ["https://www.nycgo.com/restaurant-week"],
  },
  {
    name: "Smorgasburg",
    typicalDate: "Saturdays (Williamsburg) and Sundays (Prospect Park), April-October",
    typicalTime: "11am - 6pm",
    category: "food",
    insiderContext:
      "100+ food vendors. Peak NYC summer vibes. Go at 11am sharp or after 3pm - midday lines are brutal. The ramen burger is overhyped, the Thai iced tea is not.",
    tips: [
      "11am or after 3pm to avoid lines",
      "Bring cash - some vendors don't take cards",
      "Williamsburg location has better views",
      "Prospect Park location is less crowded",
    ],
    anticipationDays: [7, 1],
    sources: ["https://www.smorgasburg.com"],
  },
  {
    name: "Oyster Week NYC",
    typicalDate: "October",
    typicalTime: "Various",
    category: "food",
    insiderContext:
      "$1 oysters at participating restaurants. Grand Central Oyster Bar goes all out. Check the participating restaurant list - some offer better deals than others.",
    tips: [
      "Grand Central Oyster Bar is the classic",
      "Some restaurants extend deals beyond official week",
      "Pair with a crisp Muscadet",
      "Tuesday/Wednesday less crowded than weekends",
    ],
    anticipationDays: [14, 7],
    sources: ["https://www.oysterweek.com"],
  },
  {
    name: "Vendy Awards (Street Food Festival)",
    typicalDate: "September",
    typicalTime: "12pm - 5pm",
    category: "food",
    insiderContext:
      "The Oscars of NYC street food. Governors Island location. Unlimited tastings from 50+ vendors. Buy tickets early, bring antacids.",
    tips: [
      "Ticket includes all-you-can-eat samples",
      "Pace yourself - 50+ vendors",
      "Ferry to Governors Island adds to the vibe",
      "Vote for your favorites",
    ],
    anticipationDays: [30, 14, 7],
    sources: ["https://streetvendor.org"],
  },

  // ============================================================================
  // CIVIC / SIGNUPS
  // ============================================================================
  {
    name: "NYC Housing Lottery (Various Buildings)",
    typicalDate: "Rolling throughout year",
    typicalTime: "Deadlines vary",
    category: "civic",
    insiderContext:
      "Affordable housing lotteries for below-market apartments. Apply even if you think you won't qualify - income bands are wider than you think. One application per building.",
    tips: [
      "NYC Housing Connect is the official portal",
      "Apply to everything - you never know",
      "Income limits are higher than people think",
      "Keep documents updated in your profile",
    ],
    anticipationDays: [14, 7, 3],
    sources: ["https://housingconnect.nyc.gov"],
  },
  {
    name: "IDNYC Renewal / New Applications",
    typicalDate: "Rolling - cards expire every 5 years",
    typicalTime: "Office hours",
    category: "civic",
    insiderContext:
      "NYC municipal ID. Free museum memberships, library access, discounts. The perks alone are worth it. Long lines in January, shorter in summer.",
    tips: [
      "Free one-year memberships to major museums",
      "Lines shorter in summer months",
      "Bring multiple forms of ID to be safe",
      "Renewal reminders come 90 days before expiration",
    ],
    anticipationDays: [90, 30],
    sources: ["https://www.nyc.gov/idnyc"],
  },
  {
    name: "NYC Summer Youth Employment Program",
    typicalDate: "Applications open January/February",
    typicalTime: "Deadline usually late February",
    category: "civic",
    insiderContext:
      "Paid summer jobs for 14-24 year olds. 100k+ jobs available. Application window is short - usually January to late February.",
    tips: [
      "14-24 years old eligible",
      "Application window is only ~6 weeks",
      "DYCD website for official info",
      "Jobs in all sectors - arts, tech, city agencies",
    ],
    anticipationDays: [30, 14, 7],
    sources: ["https://www.nyc.gov/syep"],
  },

  // ============================================================================
  // WEATHER-TRIGGERED (Evergreen templates)
  // ============================================================================
  {
    name: "First Snow of the Season",
    typicalDate: "Usually December/January",
    typicalTime: "Check forecast",
    category: "weather",
    insiderContext:
      "Central Park at dawn after a snowfall is magical. Pilgrim Hill for sledding, Bethesda Fountain for photos. ASP usually suspended - check 311.",
    tips: [
      "Pilgrim Hill is the best sledding",
      "Bethesda Fountain is iconic in snow",
      "Check 311 for ASP suspension",
      "Joe's Coffee on 13th keeps you warm",
    ],
    anticipationDays: [3, 1],
    sources: ["https://www.weather.gov/okx/"],
  },
  {
    name: "Cherry Blossom Peak Bloom",
    typicalDate: "Late March to early April",
    typicalTime: "All day",
    category: "seasonal",
    insiderContext:
      "Brooklyn Botanic Garden and Central Park are the spots. BBG gets mobbed - go on a weekday morning. The Yoshino cherries peak first, then the Kwanzan.",
    tips: [
      "BBG weekday mornings are less crowded",
      "Central Park's cherry hill is underrated",
      "Roosevelt Island has surprise cherry trees",
      "Peak bloom lasts about 10 days",
    ],
    anticipationDays: [14, 7, 3],
    sources: ["https://www.bbg.org"],
  },
  {
    name: "Beach Season Opens",
    typicalDate: "Memorial Day Weekend",
    typicalTime: "10am-6pm lifeguards",
    category: "seasonal",
    insiderContext:
      "Rockaway, Coney Island, and Brighton Beach all open. Rockaway A train takes 90 min from Midtown. Drive to Jacob Riis instead - parking free before 9am, less crowded.",
    tips: [
      "Jacob Riis is the local secret",
      "Rockaway has the best food scene",
      "A train to Rockaway is a journey",
      "Brighton Beach for authentic Russian boardwalk",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.nycgovparks.org"],
  },
  {
    name: "Governors Island Season Opens",
    typicalDate: "May 1",
    typicalTime: "10am-6pm",
    category: "seasonal",
    insiderContext:
      "The best summer escape in NYC. Free ferry on weekends before noon. Rent bikes, visit the hills, bring a picnic. Closes for winter (Nov-Apr).",
    tips: [
      "Free ferry before noon on weekends",
      "Rent bikes on the island - it's big",
      "The Hills have the best Manhattan views",
      "Bring your own food - options are limited",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.govisland.com"],
  },

  // ============================================================================
  // LOCAL / NEIGHBORHOOD
  // ============================================================================
  {
    name: "San Gennaro Festival (Little Italy)",
    typicalDate: "11 days in mid-September",
    typicalTime: "11:30am-11pm",
    category: "local",
    insiderContext:
      "Mulberry Street becomes a food carnival. The sausage and peppers are tradition. Skip the cannoli stands (overpriced) - go to Ferrara's instead.",
    tips: [
      "Sausage and peppers from any stand",
      "Cannoli from Ferrara's, not street stands",
      "Weekday evenings are less insane",
      "The zeppoles are worth the wait",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.sangennaro.nyc"],
  },
  {
    name: "Atlantic Antic (Brooklyn)",
    typicalDate: "Last Sunday of September",
    typicalTime: "12pm-6pm",
    category: "local",
    insiderContext:
      "Brooklyn's biggest street fair. Mile+ on Atlantic Ave from Hicks to 4th Ave. Local restaurants set up stands. Go for the people watching as much as the food.",
    tips: [
      "Start at Hicks, work your way east",
      "Sahadi's booth has the best bites",
      "Multiple stages with live music",
      "Neighborhood bars are packed after",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.atlanticave.org"],
  },
  {
    name: "Bastille Day on 60th Street",
    typicalDate: "Sunday closest to July 14",
    typicalTime: "12pm-5pm",
    category: "local",
    insiderContext:
      "French expats take over a block on the Upper East Side. Real French food, wine, music. The crepes and oysters are legit.",
    tips: [
      "60th Street between Fifth and Lexington",
      "Oysters and champagne are the move",
      "Kids' activities if you have little ones",
      "French Institute Alliance Française hosts",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.fiaf.org"],
  },
  {
    name: "Diwali at Times Square",
    typicalDate: "October/November (varies with lunar calendar)",
    typicalTime: "Evening celebration",
    category: "seasonal",
    insiderContext:
      "Times Square goes full Bollywood. Dancing, lights, performances. One of the largest Diwali celebrations outside India. Also check Jackson Heights for more authentic vibes.",
    tips: [
      "Jackson Heights has the real celebration",
      "Times Square is the spectacle version",
      "South Asian restaurants do special menus",
      "Sweets shops in Jackson Heights are mobbed",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.timessquarenyc.org"],
  },
  {
    name: "Village Halloween Parade",
    typicalDate: "October 31",
    typicalTime: "7pm start",
    category: "seasonal",
    insiderContext:
      "Anyone in costume can march - no registration needed. Just show up at 6:30pm on 6th Ave below Spring. The creativity is unmatched. Wear comfortable shoes.",
    tips: [
      "March by showing up at 6th & Canal in costume",
      "No registration required to participate",
      "Viewing is packed - march instead",
      "After-parties in the Village all night",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.halloween-nyc.com"],
  },
  {
    name: "SantaCon",
    typicalDate: "Second Saturday of December",
    typicalTime: "10am-whenever",
    category: "local",
    insiderContext:
      "Thousands of drunk Santas bar crawling through Manhattan. Love it or avoid it entirely - there's no middle ground. Many bars ban Santa costumes.",
    tips: [
      "Many bars ban Santas - check ahead",
      "If participating, pace yourself",
      "If avoiding, stay out of Midtown/LES",
      "Costumes range from minimal to elaborate",
    ],
    anticipationDays: [14, 7],
    sources: ["https://www.santacon.nyc"],
  },
  {
    name: "NYC Half Marathon",
    typicalDate: "Third Sunday of March",
    typicalTime: "7:30am",
    category: "sports",
    insiderContext:
      "Starts in Brooklyn, finishes in Central Park via Times Square. Entry is by lottery (January). One of the few races that goes through Times Square.",
    tips: [
      "Lottery entry opens in January",
      "Times Square section is surreal at 9am",
      "Brooklyn start means early transit",
      "Great spectating on First Avenue",
    ],
    anticipationDays: [60, 30, 7, 1],
    sources: ["https://www.nyrr.org"],
  },
  {
    name: "Fleet Week",
    typicalDate: "Last week of May",
    typicalTime: "Various events",
    category: "local",
    insiderContext:
      "Navy ships dock on the Hudson, sailors everywhere. Free ship tours at Pier 86 (Intrepid). Times Square fills with uniforms. A uniquely NYC spectacle.",
    tips: [
      "Free ship tours - get there early",
      "Intrepid has the main events",
      "Sailors get discounts everywhere",
      "Memorial Day parade on Monday",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.fleetweeknewyork.com"],
  },

  // ============================================================================
  // SAMPLE SALES / SHOPPING
  // ============================================================================
  {
    name: "260 Sample Sale Season",
    typicalDate: "Year-round, peaks in December and June",
    typicalTime: "Usually 9am-8pm",
    category: "food", // Using food as proxy for shopping/lifestyle
    insiderContext:
      "Designer fashion at 50-80% off. Lines form before opening. Sign up for their email list - sales announced with 2-3 days notice. Cash speeds checkout.",
    tips: [
      "Email list is the only way to know",
      "Get there 30 min before opening",
      "Bring cash for faster checkout",
      "December and June have the best sales",
    ],
    anticipationDays: [7, 3, 1],
    sources: ["https://www.260samplesale.com"],
  },
  {
    name: "Brooklyn Flea Season Opens",
    typicalDate: "April (weekends through October)",
    typicalTime: "10am-5pm",
    category: "local",
    insiderContext:
      "Vintage, antiques, crafts, food. DUMBO location has Manhattan skyline views. Williamsburg location is larger. Go early for the best vintage finds.",
    tips: [
      "Serious vintage hunters arrive at 10am",
      "DUMBO location has better views",
      "Williamsburg has more vendors",
      "Cash preferred by many vendors",
    ],
    anticipationDays: [14, 7],
    sources: ["https://www.brooklynflea.com"],
  },

  // ============================================================================
  // TRANSIT
  // ============================================================================
  {
    name: "Nostalgia Train (Holiday Season)",
    typicalDate: "Sundays in December",
    typicalTime: "10am-5pm",
    category: "transit",
    insiderContext:
      "Vintage subway cars from the 1930s run on regular lines. Free with MetroCard. The wood paneling and ceiling fans are a time machine. Check MTA for schedule.",
    tips: [
      "Runs on various lines - check MTA",
      "Regular MetroCard fare",
      "Cars from the 1930s-60s",
      "Great for photos and nostalgia",
    ],
    anticipationDays: [14, 7, 1],
    sources: ["https://www.nytransitmuseum.org"],
  },
  {
    name: "Second Avenue Subway Extension Updates",
    typicalDate: "Ongoing construction updates",
    typicalTime: "Various",
    category: "transit",
    insiderContext:
      "Phase 2 to 125th Street in progress. Track announcements for station openings. When it opens, the Upper East Side finally gets real subway access.",
    tips: [
      "Q train currently ends at 96th",
      "Phase 2 adds 106th, 116th, 125th",
      "Construction impacts some bus routes",
      "Target opening date keeps shifting",
    ],
    anticipationDays: [30],
    sources: ["https://www.mta.info"],
  },
];

export default EVERGREEN_EVENTS;

/**
 * Seed EvergreenEvent table with pre-loaded annual NYC events
 * Uses upsert to allow re-running without duplicates
 */
export async function seedEvergreenEvents() {
  console.log("🌲 Seeding evergreen events...");

  for (const event of EVERGREEN_EVENTS) {
    await prisma.evergreenEvent.upsert({
      where: {
        // Use name as unique identifier since these are curated events
        id: generateEventId(event.name),
      },
      update: {
        name: event.name,
        typicalDate: event.typicalDate,
        typicalTime: event.typicalTime || null,
        category: event.category,
        insiderContext: event.insiderContext,
        tips: event.tips,
        anticipationDays: event.anticipationDays,
        sources: event.sources,
        isActive: true,
      },
      create: {
        id: generateEventId(event.name),
        name: event.name,
        typicalDate: event.typicalDate,
        typicalTime: event.typicalTime || null,
        category: event.category,
        insiderContext: event.insiderContext,
        tips: event.tips,
        anticipationDays: event.anticipationDays,
        sources: event.sources,
        isActive: true,
      },
    });
  }

  console.log(`✅ Seeded ${EVERGREEN_EVENTS.length} evergreen events`);
}

/**
 * Generate deterministic ID from event name for upsert matching
 */
function generateEventId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
