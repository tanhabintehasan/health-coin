import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : (exception as any)?.message || 'Internal server error';

    // Log full error details to console so Render logs capture it
    console.error('[UNHANDLED EXCEPTION]', {
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      exception,
    });

    response.status(status).json({
      statusCode: status,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    });
  }
}
