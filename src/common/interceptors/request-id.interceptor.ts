import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method = req.method;
    const url = req.originalUrl || req.url;

    const incomingId = req.header('x-request-id');
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : uuidv4();

    // Expose request id to the client
    res.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();
    this.logger.log(`[${requestId}] -> ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        this.logger.log(`[${requestId}] <- ${method} ${url} ${res.statusCode} ${ms}ms`);
      }),
      catchError((err) => {
        const ms = Date.now() - startedAt;
        this.logger.error(`[${requestId}] !! ${method} ${url} ${res.statusCode} ${ms}ms: ${err?.message || err}`);
        throw err;
      }),
    );
  }
}
