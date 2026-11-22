// Turns every error the server throws into one JSON shape: { code, message }.
//
// Example: a service runs `throw new NotFoundException({ code: 'SHUL_NOT_FOUND',
// message: '...' })`, and the website receives
//   404  { "code": "SHUL_NOT_FOUND", "message": "..." }
//
// The website shows its own wording for each `code` (see web/src/api.ts), so
// `message` here is a fallback for developers, not what users read.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiError } from '@shiurfinder/shared';

// The code to use when the thrower didn't give one.
const CODE_FOR_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'NOT_SIGNED_IN',
  [HttpStatus.FORBIDDEN]: 'NO_PERMISSION',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

@Catch() // no argument = catch every kind of error
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    // Anything that isn't an HttpException is a bug on our side: a 500.
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong. Try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODE_FOR_STATUS[status] ?? 'INTERNAL_ERROR';

      // The body is either a plain string or the object passed to the exception.
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (typeof obj.code === 'string') code = obj.code;
        if (typeof obj.message === 'string') message = obj.message;
        else if (Array.isArray(obj.message)) message = obj.message.join(', ');
      }
    }

    // Server bugs get logged with their stack trace. 4xx errors are the
    // caller's mistake and aren't worth logging.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ApiError = { code, message };
    response.status(status).json(payload);
  }
}
