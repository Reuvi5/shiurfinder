import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Turns a Zod schema into a Nest pipe, so a controller validates by naming a
 * schema instead of writing checks by hand.
 *
 * A failure becomes the same { code, message } shape as every other error
 * (SDD, Errors), with the first field problem named so the website can show it
 * beside the field it belongs to.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.errors[0];
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: first
            ? `${first.path.join('.') || 'request'}: ${first.message}`
            : 'That request was not valid.',
        });
      }
      throw error;
    }
  }
}
