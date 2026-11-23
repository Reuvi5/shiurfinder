// Ties the shul and maggid shiur pages' pieces together for NestJS (FR-10).
//
// A request flows through this folder like this:
//   publishers.controller.ts  receives the request
//   publishers.service.ts     builds the page
//   publishers.queries.ts     fetches the rows from the database
//
// Later, publisher sign-up, profiles, rooms and teams (FR-17, FR-18) belong here too.

import { Module } from '@nestjs/common';
import { PublishersController } from './publishers.controller';
import { PublishersQueries } from './publishers.queries';
import { PublishersService } from './publishers.service';

@Module({
  controllers: [PublishersController],
  providers: [PublishersService, PublishersQueries],
})
export class PublishersModule {}
