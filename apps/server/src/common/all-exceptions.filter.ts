import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { ApiError } from '@shiurfinder/shared';

/**
 * SDD, Errors: "The server returns every error in one format: a code and a plain
 * message. One NestJS filter handles this for the whole server."
 *
 * The website maps `code` to its own friendlier wording, so the message here is
 * a fallback, not the thing users are meant to read.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong. Try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = this.codeForStatus(status);

      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (typeof obj.code === 'string') code = obj.code;
        if (typeof obj.message === 'string') message = obj.message;
        else if (Array.isArray(obj.message)) message = obj.message.join(', ');
      }
    }

    if (status >= 500) {
      // Sentry goes here once we wire it up.
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ApiError = { code, message };
    response.status(status).json(payload);
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'NOT_SIGNED_IN';
      case HttpStatus.FORBIDDEN:
        return 'NO_PERMISSION';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
