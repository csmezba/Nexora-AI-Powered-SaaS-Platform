import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class ResponseTransformMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      if (body && typeof body === 'object') {
        if (!('success' in body)) {
          const isError = Boolean(body.errors && body.errors.length > 0);
          const firstError = isError ? body.errors[0] : null;
          const statusCode = isError
            ? (firstError?.statusCode ?? res.statusCode ?? 500)
            : (res.statusCode || 200);
          const message = isError
            ? (firstError?.message ?? 'An error occurred')
            : 'Success';

          const transformed = {
            success: !isError,
            statusCode,
            message,
            ...body,
            ...(isError && !('data' in body) ? { data: null } : {}),
          };
          return originalJson(transformed);
        }
      }
      return originalJson(body);
    };

    res.send = (body: any) => {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === 'object' && !('success' in parsed)) {
            const isError = Boolean(parsed.errors && parsed.errors.length > 0);
            const firstError = isError ? parsed.errors[0] : null;
            const statusCode = isError
              ? (firstError?.statusCode ?? res.statusCode ?? 500)
              : (res.statusCode || 200);
            const message = isError
              ? (firstError?.message ?? 'An error occurred')
              : 'Success';

            const transformed = {
              success: !isError,
              statusCode,
              message,
              ...parsed,
              ...(isError && !('data' in parsed) ? { data: null } : {}),
            };
            return originalSend(JSON.stringify(transformed));
          }
        } catch {
          // not valid json string, pass through
        }
      }
      return originalSend(body);
    };

    next();
  }
}
