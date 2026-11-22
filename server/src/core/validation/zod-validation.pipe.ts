// Checks a request's input against a Zod schema before the controller sees it.
//
// Usage in a controller:
//   @Query(new ZodValidationPipe(mySchema)) query: MyType
//
// If the input is valid, the controller gets the parsed value (for example,
// "40.9" from the URL is turned into the number 40.9).
// If not, the request is rejected with 400 and a message naming the first bad
// field, e.g. { code: 'INVALID_REQUEST', message: 'lat: Expected number' }.

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;

      const first = error.errors[0];
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: first
          ? `${first.path.join('.') || 'request'}: ${first.message}`
          : 'That request was not valid.',
      });
    }
  }
}
