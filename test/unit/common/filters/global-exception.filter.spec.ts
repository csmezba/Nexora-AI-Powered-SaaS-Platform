import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GlobalExceptionFilter } from '../../../../src/common/filters/global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  describe('HTTP Context', () => {
    it('should format HttpException with string response correctly', () => {
      const mockJson = vi.fn();
      const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
      const mockHost = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({
            status: mockStatus,
          }),
        }),
      } as any;

      const exception = new NotFoundException('Resource not found');
      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        errors: [
          {
            message: 'Resource not found',
            success: false,
            statusCode: HttpStatus.NOT_FOUND,
            error: 'Resource not found',
          },
        ],
        data: null,
      });
    });

    it('should format BadRequestException with array of validation messages', () => {
      const mockJson = vi.fn();
      const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
      const mockHost = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({
            status: mockStatus,
          }),
        }),
      } as any;

      const exception = new BadRequestException({
        message: ['email must be valid', 'password is too short'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'email must be valid, password is too short',
        errors: [
          {
            message: 'email must be valid, password is too short',
            success: false,
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'email must be valid, password is too short',
          },
        ],
        data: null,
      });
    });

    it('should handle standard generic Error as 500', () => {
      const mockJson = vi.fn();
      const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
      const mockHost = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({
            status: mockStatus,
          }),
        }),
      } as any;

      const exception = new Error('Database connection failed');
      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection failed',
        errors: [
          {
            message: 'Database connection failed',
            success: false,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Database connection failed',
          },
        ],
        data: null,
      });
    });

    it('should handle unknown non-Error types gracefully', () => {
      const mockJson = vi.fn();
      const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
      const mockHost = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({
            status: mockStatus,
          }),
        }),
      } as any;

      filter.catch('String exception', mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        errors: [
          {
            message: 'Internal server error',
            success: false,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal server error',
          },
        ],
        data: null,
      });
    });
  });

  describe('GraphQL Context', () => {
    it('should return GraphQLError with required extensions when in GraphQL context', () => {
      const mockHost = {
        getType: vi.fn().mockReturnValue('graphql'),
      } as any;

      const exception = new NotFoundException('User not found');
      const result = filter.catch(exception, mockHost);

      expect(result).toBeInstanceOf(GraphQLError);
      const gqlError = result as GraphQLError;
      expect(gqlError.message).toBe('User not found');
      expect(gqlError.extensions).toMatchObject({
        message: 'User not found',
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        error: 'User not found',
      });
    });
  });
});
