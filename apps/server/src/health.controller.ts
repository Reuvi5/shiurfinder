import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * What the uptime monitor hits every few minutes. That ping is also what keeps
 * Render's free instance from sleeping, which is what makes the every-minute
 * reminder job possible (SDD, Render setup).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; db: 'up' | 'down'; postgis: string | null }> {
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
