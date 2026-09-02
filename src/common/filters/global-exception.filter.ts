import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import type { Response } from 'express';

export interface GlobalErrorResponse {
  message: string;
  success: boolean;
  statusCode: number;
  error: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMsg = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMsg = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          errorMsg = resObj.message.join(', ');
        } else if (typeof resObj.message === 'string') {
          errorMsg = resObj.message;
        } else if (typeof resObj.error === 'string') {
          errorMsg = resObj.error;
        }
      }
    } else if (exception instanceof GraphQLError) {
      errorMsg = exception.message;
      const extensions = exception.extensions as Record<string, unknown> | undefined;
      if (extensions?.statusCode && typeof extensions.statusCode === 'number') {
        statusCode = extensions.statusCode;
      } else if (extensions?.statuscode && typeof extensions.statuscode === 'number') {
        statusCode = extensions.statuscode;
      } else if (extensions?.status && typeof extensions.status === 'number') {
        statusCode = extensions.status;
      }
    } else if (exception instanceof Error) {
      errorMsg = exception.message;
    }

    this.logger.error(
      `[${statusCode}] ${errorMsg}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorPayload: GlobalErrorResponse = {
      message: errorMsg,
      success: false,
      statusCode,
      error: errorMsg,
    };

    const hostType = host.getType<GqlContextType>();
    if (hostType === 'graphql') {
      return new GraphQLError(errorMsg, {
        extensions: {
          ...errorPayload,
        },
      });
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response && typeof response.status === 'function') {
      return response.status(statusCode).json(errorPayload);
    }

    return errorPayload;
  }
}
