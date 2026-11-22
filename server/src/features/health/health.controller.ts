// GET /health: a quick check that the server is up and can reach the database.
//
// Also reports the PostGIS version, which is the fastest way to tell whether
// the map extension is actually installed in the database.
// Uptime monitors ping this to keep the hosted server awake.

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

interface HealthResult {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  postgis: string | null;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResult> {
    try {
      const rows = await this.prisma.$queryRaw<{ version: string }[]>`
        SELECT PostGIS_Lib_Version() AS version;
      `;
      return { status: 'ok', db: 'up', postgis: rows[0]?.version ?? null };
    } catch {
      return { status: 'degraded', db: 'down', postgis: null };
    }
  }
}
