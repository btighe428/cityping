import { prisma } from "../src/lib/db";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

/**
 * NYC Arts, Museums & Theater Events Seed File for 2026
 * Comprehensive calendar of major cultural events across museums, galleries,
 * Broadway, off-Broadway, and public art installations in New York City
 */

export const artsEventsData = [
  // MAJOR MUSEUM EXHIBITIONS
  {
    title: "Raphael: Sublime Poetry",
    description: "A landmark exhibition featuring 200+ works by the Renaissance master, spanning drawings, paintings, and prints from across his career. The most comprehensive Raphael retrospective in recent decades.",
    category: "culture" as const,
    startsAt: new Date("2026-03-29"),
    venue: "The Metropolitan Museum of Art",
    neighborhood: "Upper East Side"
  },
  {
    title: "Marcel Duchamp: A Retrospective",
    description: "The first major Duchamp retrospective since 1973, presenting 300 works of art including the iconic 'Fountain' and his conceptual masterpieces. A transformative exhibition exploring the artist who changed modern art forever.",
    category: "culture" as const,
    startsAt: new Date("2026-02-28"),
    venue: "Museum of Modern Art (MoMA)",
    neighborhood: "Midtown West"
  },
  {
    title: "82nd Whitney Biennial",
    description: "The Whitney Museum's prestigious biennial survey of contemporary American art, showcasing emerging and established artists working in diverse mediums. A defining event for contemporary art.",
    category: "culture" as const,
    startsAt: new Date("2026-03-08"),
    venue: "Whitney Museum of American Art",
    neighborhood: "Upper West Side"
  },
  {
    title: "Carol Bove: Rotunda Exhibition",
    description: "A major solo exhibition by acclaimed sculptor and installation artist Carol Bove, featuring monumental works filling the iconic Guggenheim rotunda space with her organic, architectural sculptures.",
    category: "culture" as const,
    startsAt: new Date("2026-03-05"),
    venue: "The Guggenheim Museum",
    neighborhood: "Upper East Side"
  },
  {
    title: "Taryn Simon: Rotunda Commission",
    description: "A significant rotunda installation by conceptual artist Taryn Simon, exploring themes of power, technology, and human experience through her distinctive multimedia practice.",
    category: "culture" as const,
    startsAt: new Date("2026-06-15"),
    venue: "The Guggenheim Museum",
    neighborhood: "Upper East Side"
  },
  {
    title: "Pop Art at the Guggenheim",
    description: "A comprehensive presentation of Pop Art from the 1950s-1970s, featuring Warhol, Lichtenstein, Claes Oldenburg, and international Pop pioneers exploring consumer culture and mass media.",
    category: "culture" as const,
    startsAt: new Date("2026-05-20"),
    venue: "The Guggenheim Museum",
    neighborhood: "Upper East Side"
  },
  {
    title: "Greater New York 2026",
    description: "The sixth edition of MoMA PS1's prestigious survey of contemporary artists living and working in New York City. Showcasing the latest directions in visual art, video, and experimental practice.",
    category: "culture" as const,
    startsAt: new Date("2026-04-16"),
    venue: "MoMA PS1",
    neighborhood: "Long Island City"
  },

  // CHELSEA GALLERY EXHIBITIONS
  {
    title: "Louise Bourgeois: Gathering Wool",
    description: "An intimate exhibition of intimate-scale works by legendary artist Louise Bourgeois, exploring themes of domesticity, memory, and textile art through wool and mixed media works.",
    category: "culture" as const,
    startsAt: new Date("2026-02-15"),
    venue: "Hauser & Wirth (Chelsea)",
    neighborhood: "Chelsea"
  },
  {
    title: "Ursula von Rydingsvard: Sculptural Visions",
    description: "Exhibition of monumental cedar sculptures and drawings by the celebrated sculptor, exploring landscape, nature, and abstraction through organic forms and materials.",
    category: "culture" as const,
    startsAt: new Date("2026-02-19"),
    venue: "Various Chelsea Galleries",
    neighborhood: "Chelsea"
  },
  {
    title: "Jeff Koons: Porcelain Series",
    description: "An exclusive presentation of new and recent sculptures and paintings by Jeff Koons, featuring his signature glossy porcelain pieces and monumental public works.",
    category: "culture" as const,
    startsAt: new Date("2026-01-15"),
    venue: "Gagosian (Chelsea)",
    neighborhood: "Chelsea"
  },
  {
    title: "Gideon Appah: Swimmers and Surfers",
    description: "First solo show with Pace Gallery by emerging artist Gideon Appah, featuring paintings inspired by Ghanaian coastal scenes, maritime culture, and contemporary identity.",
    category: "culture" as const,
    startsAt: new Date("2026-01-16"),
    venue: "Pace Gallery (Chelsea)",
    neighborhood: "Chelsea"
  },

  // BROADWAY THEATER OPENINGS
  {
    title: "Every Brilliant Thing",
    description: "Broadway premiere of this acclaimed one-man show about a man looking back on his life, starring Tony winner Daniel Radcliffe. Opening after successful run in London.",
    category: "culture" as const,
    startsAt: new Date("2026-03-12"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Dog Day Afternoon",
    description: "New Broadway adaptation of the legendary film with Jon Bernthal and Ebon Moss-Bachrach. A tense, gripping crime drama brought to the stage.",
    category: "culture" as const,
    startsAt: new Date("2026-03-30"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Giant",
    description: "Broadway musical featuring John Lithgow as children's author Roald Dahl, exploring his life, creativity, and legacy through music and storytelling.",
    category: "culture" as const,
    startsAt: new Date("2026-03-23"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Death of a Salesman",
    description: "Revival of Arthur Miller's American classic starring Nathan Lane and Laurie Metcalf, directed by Ivo van Hove. A modern reimagining of this timeless tragedy.",
    category: "culture" as const,
    startsAt: new Date("2026-04-09"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Cats: The Jellicle Ball",
    description: "Audacious revival reconceiving the feline pageant as a drag ballroom extravaganza. A bold, reimagined take on the classic musical.",
    category: "culture" as const,
    startsAt: new Date("2026-04-07"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Beaches: The Musical",
    description: "New musical adaptation based on the beloved novel and film, featuring classic songs and exploring friendship, ambition, and life's biggest moments.",
    category: "culture" as const,
    startsAt: new Date("2026-04-22"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },
  {
    title: "Dreamgirls",
    description: "Broadway's first all-new production of this beloved musical about three women rising through the ranks of the music industry, with new direction and choreography.",
    category: "culture" as const,
    startsAt: new Date("2026-10-15"),
    venue: "Broadway Theater District",
    neighborhood: "Midtown West"
  },

  // OFF-BROADWAY PREMIERES
  {
    title: "You Got Older",
    description: "New play by Clare Barron, directed by Anne Kauffman, starring Alia Shawkat and Peter Friedman. An intimate exploration of aging and life's passages.",
    category: "culture" as const,
    startsAt: new Date("2026-02-23"),
    venue: "Cherry Lane Theatre",
    neighborhood: "West Village"
  },
  {
    title: "Marcel on the Train",
    description: "Collaborative play by Marshall Pailet and Ethan Slater, directed by Marshall Pailet. A unique theatrical exploration at Classic Stage Company.",
    category: "culture" as const,
    startsAt: new Date("2026-02-22"),
    venue: "Classic Stage Company",
    neighborhood: "Nolita"
  },
  {
    title: "Mother Russia",
    description: "New play by Lauren Yee, directed by Teddy Bergman at Signature Theatre. A contemporary drama exploring cultural identity and belonging.",
    category: "culture" as const,
    startsAt: new Date("2026-02-24"),
    venue: "Signature Theatre Center",
    neighborhood: "Midtown West"
  },
  {
    title: "La Cage aux Folles",
    description: "Semi-revival of Jerry Herman's beloved musical featuring Wayne Brady and Billy Porter, bringing new energy to this classic celebration of identity and love.",
    category: "culture" as const,
    startsAt: new Date("2026-06-17"),
    venue: "New York City Center",
    neighborhood: "Midtown West"
  },

  // ART FAIRS
  {
    title: "Frieze New York 2026",
    description: "Premier contemporary art fair at The Shed featuring 70+ leading galleries from around the world. Four days of curated contemporary art, with talks and special presentations.",
    category: "culture" as const,
    startsAt: new Date("2026-05-14"),
    venue: "The Shed",
    neighborhood: "Hudson Yards"
  },
  {
    title: "TEFAF New York 2026",
    description: "Nine-day fine art fair at Park Avenue Armory with 90+ prestigious galleries showcasing modern, contemporary art, design, jewelry, and ancient art from top dealers worldwide.",
    category: "culture" as const,
    startsAt: new Date("2026-05-15"),
    venue: "Park Avenue Armory",
    neighborhood: "Upper East Side"
  },
  {
    title: "Independent Art Fair 2026",
    description: "Prestigious curated art fair relocated to Pier 36 featuring 50+ galleries with a focus on discovery and quality. Architectural exterior design by SO-il.",
    category: "culture" as const,
    startsAt: new Date("2026-05-15"),
    venue: "Pier 36",
    neighborhood: "Lower East Side"
  },
  {
    title: "The Armory Show 2026",
    description: "Historic art fair returning with galleries showcasing modern and contemporary art, design, and photography across multiple sectors and price points.",
    category: "culture" as const,
    startsAt: new Date("2026-09-24"),
    venue: "Piers 92 & 94",
    neighborhood: "Midtown West"
  },

  // PUBLIC ART & INSTALLATIONS
  {
    title: "High Line Spring Art 2026: Spring Cleaning",
    description: "Katherine Bernhardt's large-scale Billboard takeover at 18th Street. Vibrant, energetic abstract painting activating the elevated park's prime viewing location.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    venue: "The High Line",
    neighborhood: "Chelsea"
  },
  {
    title: "High Line Spring Art 2026: Bronze Corn Fountain",
    description: "Ximena Garrido-Lecca's monumental nine-foot bronze corn-cob fountain. A sculptural installation exploring agriculture, industry, and form.",
    category: "culture" as const,
    startsAt: new Date("2026-04-01"),
    venue: "The High Line",
    neighborhood: "Chelsea"
  },
  {
    title: "High Line Spring Art 2026: Painted Figures",
    description: "Derek Fordjour's painted bronze figures of Black subjects alongside his 'Backbreaker Double' mural. A powerful exploration of labor, identity, and representation.",
    category: "culture" as const,
    startsAt: new Date("2026-04-01"),
    venue: "The High Line",
    neighborhood: "Chelsea"
  },
  {
    title: "DUMBO Open Studios 2026",
    description: "Two-day art event where DUMBO studios open to the public, showcasing painters, sculptors, photographers, and mixed media artists in their working spaces.",
    category: "culture" as const,
    startsAt: new Date("2026-04-18"),
    venue: "DUMBO Artist Studios",
    neighborhood: "DUMBO"
  },
  {
    title: "Greenpoint Open Studios 2026",
    description: "Weekend-long event where hundreds of Greenpoint artists open their studios, showcasing paintings, sculptures, photography, textiles, ceramics, and more.",
    category: "culture" as const,
    startsAt: new Date("2026-05-16"),
    venue: "Greenpoint Artist Studios",
    neighborhood: "Greenpoint"
  },

  // SPECIAL EVENTS & MUSEUM NIGHTS
  {
    title: "UNIQLO Friday Nights at MoMA",
    description: "Free admission for New York State residents on Friday evenings from 5:30-8:30 PM (reservations required). Enjoy world-class contemporary and modern art.",
    category: "culture" as const,
    startsAt: new Date("2026-02-06"),
    venue: "Museum of Modern Art (MoMA)",
    neighborhood: "Midtown West"
  },
  {
    title: "Guggenheim Pay-What-You-Wish Saturdays",
    description: "Pay-what-you-wish admission (minimum $1) on Saturday evenings from 4-5:30 PM. Experience the iconic spiral building and rotating exhibitions.",
    category: "culture" as const,
    startsAt: new Date("2026-02-07"),
    venue: "The Guggenheim Museum",
    neighborhood: "Upper East Side"
  },
  {
    title: "Carnegie Hall Opening Night Gala 2026",
    description: "Grand season opening featuring Jonas Kaufmann in concert. A spectacular evening celebrating the concert hall's heritage and artistic excellence.",
    category: "culture" as const,
    startsAt: new Date("2026-10-08"),
    venue: "Carnegie Hall",
    neighborhood: "Midtown West"
  },
  {
    title: "Lincoln Center Lunar New Year Gala",
    description: "Celebratory performance honoring Lunar New Year with the New York Philharmonic and special guest artists. A festive multicultural celebration.",
    category: "culture" as const,
    startsAt: new Date("2026-02-25"),
    venue: "David Geffen Hall, Lincoln Center",
    neighborhood: "Upper West Side"
  },
  {
    title: "Metropolitan Opera Spring 2026 Gala",
    description: "Spectacular opening gala of the spring operatic season at Lincoln Center. Star-studded evening featuring world-class singers and orchestral performances.",
    category: "culture" as const,
    startsAt: new Date("2026-05-01"),
    venue: "Metropolitan Opera House, Lincoln Center",
    neighborhood: "Upper West Side"
  }
];
