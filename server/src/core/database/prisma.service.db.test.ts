// Checks the SQL tests' database is set up right: it connects, and it has the
// two extensions the queries need (PostGIS for distance, pg_trgm for typos).

import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service';

const prisma = new PrismaService();

afterAll(() => prisma.$disconnect());

describe('test database', () => {
  it('has PostGIS and pg_trgm', async () => {
    const rows = await prisma.$queryRaw<{ extname: string }[]>`SELECT extname FROM pg_extension`;
    expect(rows.map((row) => row.extname)).toEqual(expect.arrayContaining(['postgis', 'pg_trgm']));
  });
});
