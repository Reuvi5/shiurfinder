// Fills the database with demo data: 7 shuls around Teaneck with weekly and
// featured shiurim, so the map has pins and both tabs have rows.
// The shiurim are made up. This is demo data, not a real schedule.
//
//   npm run db:seed
//
// Safe to run more than once: it skips anything that already exists.

import { PrismaClient, PublisherType, ShiurKind } from '@prisma/client';

const prisma = new PrismaClient();

const TOPICS = [
  'Tanach',
  'Mishna',
  'Gemara',
  'Halacha',
  'Tefillah',
  'Moadim',
  'Parsha',
  'Machshava',
  'Mussar',
];
const LANGUAGES = ['English', 'Hebrew', 'Yiddish'];
const AUDIENCES = ['Men', 'Women', 'Teens', 'Everyone'];

interface SeedShul {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rooms: string[];
}

const SHULS: SeedShul[] = [
  {
    name: 'Congregation Beth Aaron',
    address: '950 Queen Anne Rd, Teaneck, NJ 07666',
    lat: 40.8893,
    lng: -74.0151,
    rooms: ['Main Beis Medrash', 'Social Hall'],
  },
  {
    name: 'Congregation Bnai Yeshurun',
    address: '641 W Englewood Ave, Teaneck, NJ 07666',
    lat: 40.9035,
    lng: -74.0246,
    rooms: ['Main Sanctuary', 'Beis Medrash'],
  },
  {
    name: 'Congregation Rinat Yisrael',
    address: '389 W Englewood Ave, Teaneck, NJ 07666',
    lat: 40.9015,
    lng: -74.0162,
    rooms: ['Main Sanctuary'],
  },
  {
    name: 'Congregation Keter Torah',
    address: '600 Roemer Ave, Teaneck, NJ 07666',
    lat: 40.8966,
    lng: -74.0206,
    rooms: ['Main Beis Medrash', 'Downstairs'],
  },
  {
    name: 'Congregation Ahavath Torah',
    address: '240 Broad Ave, Englewood, NJ 07631',
    lat: 40.8917,
    lng: -73.9735,
    rooms: ['Main Sanctuary', 'Beis Medrash'],
  },
  {
    name: 'Congregation Shomrei Emunah',
    address: '89 Huguenot Ave, Englewood, NJ 07631',
    lat: 40.8869,
    lng: -73.9788,
    rooms: ['Main Sanctuary'],
  },
  {
    // Far enough out to fall outside a 2-5 mile search, so the radius filter
    // is visibly doing something during the demo.
    name: 'Congregation Ohr HaTorah',
    address: '1 Kalisa Way, Paramus, NJ 07652',
    lat: 40.9445,
    lng: -74.0754,
    rooms: ['Main Sanctuary'],
  },
];

const MAGGIDEI_SHIUR = [
  'Rabbi Yaakov Neuburger',
  'Rabbi Steven Pruzansky',
  'Rabbi Chaim Strauchler',
  'Rabbi Ely Allen',
  'Rebbetzin Shani Taragin',
];

interface SeedWeekly {
  title: string;
  topic: string;
  language: string;
  days: number[]; // 0 = Sunday
  time: string; // "HH:mm" New York
  durationMinutes: number;
}

// One line per shiur on purpose, so these tables are easy to read.
// prettier-ignore
const WEEKLY_TEMPLATES: SeedWeekly[] = [
  { title: 'Daf Yomi', topic: 'Gemara', language: 'English', days: [0, 1, 2, 3, 4], time: '06:15', durationMinutes: 45 },
  { title: 'Night Seder Chavrusa Program', topic: 'Gemara', language: 'English', days: [1, 2, 3], time: '20:30', durationMinutes: 90 },
  { title: 'Halacha of the Week', topic: 'Halacha', language: 'English', days: [2], time: '20:00', durationMinutes: 60 },
  { title: 'Parsha Shiur for Women', topic: 'Parsha', language: 'English', days: [4], time: '10:00', durationMinutes: 60 },
  { title: 'Mishna Berura B’iyun', topic: 'Halacha', language: 'Hebrew', days: [0, 3], time: '19:45', durationMinutes: 45 },
  { title: 'Chumash with Meforshim', topic: 'Tanach', language: 'English', days: [1], time: '09:30', durationMinutes: 60 },
  { title: 'Mussar Seder', topic: 'Mussar', language: 'English', days: [4], time: '07:00', durationMinutes: 30 },
  { title: 'Tefillah B’iyun', topic: 'Tefillah', language: 'English', days: [0], time: '08:45', durationMinutes: 45 },
];

// prettier-ignore
const FEATURED_TEMPLATES = [
  { title: 'Guest Lecture: Living with the Parsha', topic: 'Parsha', language: 'English', inDays: 2, time: '20:00' },
  { title: 'Pre-Chanukah Halacha Shiur', topic: 'Moadim', language: 'English', inDays: 4, time: '19:30' },
  { title: 'Scholar in Residence: Emunah in Hard Times', topic: 'Machshava', language: 'English', inDays: 5, time: '19:00' },
  { title: 'Women’s Rosh Chodesh Shiur', topic: 'Machshava', language: 'English', inDays: 1, time: '20:15' },
];

/**
 * Turn a New York wall-clock time into a UTC Date.
 * Does the offset properly rather than hardcoding -5, so seeding still lines up
 * across a daylight-saving change.
 */
function nyTimeToUtc(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  // Start from the naive UTC instant, then correct by New York's offset on that date.
  const naive = Date.UTC(y, m, d, hours, minutes, 0, 0);
  const offsetMinutes = nyOffsetMinutes(new Date(naive));
  return new Date(naive + offsetMinutes * 60_000);
}

/** How far behind UTC New York is on a given instant, in minutes (300 or 240). */
function nyOffsetMinutes(at: Date): number {
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  const ny = new Date(at.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return Math.round((utc.getTime() - ny.getTime()) / 60_000);
}

async function main(): Promise<void> {
  console.log('Seeding ShiurFinder…');

  // Lists first — everything else points at them.
  await Promise.all([
    ...TOPICS.map((name, sort) =>
      prisma.topic.upsert({ where: { name }, update: { sort }, create: { name, sort } }),
    ),
    ...LANGUAGES.map((name, sort) =>
      prisma.language.upsert({ where: { name }, update: { sort }, create: { name, sort } }),
    ),
    ...AUDIENCES.map((name, sort) =>
      prisma.audience.upsert({ where: { name }, update: { sort }, create: { name, sort } }),
    ),
  ]);

  const topics = await prisma.topic.findMany();
  const languages = await prisma.language.findMany();
  const topicId = (name: string) => topics.find((t) => t.name === name)?.id;
  const languageId = (name: string) => languages.find((l) => l.name === name)?.id;

  // Maggidei shiur are publishers too (type MAGGID_SHIUR, no address of their own).
  const ravIds: string[] = [];
  for (const name of MAGGIDEI_SHIUR) {
    const existing = await prisma.publisher.findFirst({
      where: { name, type: PublisherType.MAGGID_SHIUR },
    });
    const rav =
      existing ??
      (await prisma.publisher.create({
        data: { name, type: PublisherType.MAGGID_SHIUR, approved: true },
      }));
    ravIds.push(rav.id);
  }

  let weeklyCount = 0;
  let featuredCount = 0;
  let occurrenceCount = 0;

  for (const [shulIndex, seed] of SHULS.entries()) {
    const existing = await prisma.publisher.findFirst({
      where: { name: seed.name, type: PublisherType.SHUL },
    });

    const shul =
      existing ??
      (await prisma.publisher.create({
        data: {
          name: seed.name,
          type: PublisherType.SHUL,
          address: seed.address,
          city: seed.address.includes('Englewood')
            ? 'Englewood'
            : seed.address.includes('Paramus')
              ? 'Paramus'
              : 'Teaneck',
          state: 'NJ',
          approved: true, // a moderator has verified these (NFR-4)
        },
      }));

    // Prisma can't write the geography column, so the point goes in by raw SQL.
    // Longitude first: ST_MakePoint(lng, lat).
    await prisma.$executeRaw`
      UPDATE "Publisher"
      SET location = ST_SetSRID(ST_MakePoint(${seed.lng}, ${seed.lat}), 4326)::geography
      WHERE id = ${shul.id};
    `;

    const rooms = [];
    for (const roomName of seed.rooms) {
      rooms.push(
        await prisma.room.upsert({
          where: { publisherId_name: { publisherId: shul.id, name: roomName } },
          update: {},
          create: { publisherId: shul.id, name: roomName },
        }),
      );
    }

    // Give each shul a rotating slice of the weekly templates, so the shuls
    // don't all look identical on the map.
    const weeklyForThisShul = WEEKLY_TEMPLATES.filter(
      (_, i) => (i + shulIndex) % 2 === 0 || i === shulIndex % WEEKLY_TEMPLATES.length,
    );

    for (const template of weeklyForThisShul) {
      const already = await prisma.shiur.findFirst({
        where: { shulId: shul.id, title: template.title, kind: ShiurKind.WEEKLY },
      });
      if (already) continue;

      const shiur = await prisma.shiur.create({
        data: {
          kind: ShiurKind.WEEKLY,
          title: template.title,
          description: `${template.title} at ${shul.name}.`,
          shulId: shul.id,
          maggidShiurId: ravIds[(shulIndex + weeklyCount) % ravIds.length],
          roomId: rooms[weeklyCount % rooms.length]?.id,
          topicId: topicId(template.topic),
          languageId: languageId(template.language),
          daysOfWeek: template.days,
          startTime: template.time,
          durationMinutes: template.durationMinutes,
        },
      });
      weeklyCount += 1;

      // 8 weeks of dates, which is what the nightly job will keep topped up
      // (Figure 2 notes).
      occurrenceCount += await createWeeklyOccurrences(shiur.id, template, 8);

      await prisma.changeHistory.create({
        data: { shiurId: shiur.id, summary: 'created (seed)' },
      });
    }

    // Two of the shuls get a featured shiur.
    if (shulIndex < FEATURED_TEMPLATES.length) {
      const template = FEATURED_TEMPLATES[shulIndex];
      const already = await prisma.shiur.findFirst({
        where: { shulId: shul.id, title: template.title, kind: ShiurKind.FEATURED },
      });
      if (!already) {
        const date = new Date();
        date.setDate(date.getDate() + template.inDays);
        const startsAt = nyTimeToUtc(date, template.time);

        const shiur = await prisma.shiur.create({
          data: {
            kind: ShiurKind.FEATURED,
            title: template.title,
            description: `A one-time shiur at ${shul.name}.`,
            shulId: shul.id,
            maggidShiurId: ravIds[shulIndex % ravIds.length],
            roomId: rooms[0]?.id,
            topicId: topicId(template.topic),
            languageId: languageId(template.language),
          },
        });
        await prisma.occurrence.create({
          data: {
            shiurId: shiur.id,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 60 * 60_000),
            roomId: rooms[0]?.id,
          },
        });
        featuredCount += 1;
        occurrenceCount += 1;
      }
    }
  }

  console.log(
    `Done. ${SHULS.length} shuls, ${weeklyCount} weekly shiurim, ` +
      `${featuredCount} featured, ${occurrenceCount} dates.`,
  );
}

/** Generate `weeks` worth of dated instances for a weekly shiur. */
async function createWeeklyOccurrences(
  shiurId: string,
  template: SeedWeekly,
  weeks: number,
): Promise<number> {
  const rows: { shiurId: string; startsAt: Date; endsAt: Date }[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    if (!template.days.includes(date.getDay())) continue;

    const startsAt = nyTimeToUtc(date, template.time);
    if (startsAt.getTime() < Date.now()) continue; // skip ones already past

    rows.push({
      shiurId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + template.durationMinutes * 60_000),
    });
  }

  const result = await prisma.occurrence.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
