import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from '../../../../src/common/interceptors/transform-response.interceptor.js';

describe('TransformResponseInterceptor', () => {
  it('should wrap HTTP responses in a standard success envelope', async () => {
    const interceptor = new TransformResponseInterceptor();

    const mockExecutionContext = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue({ statusCode: 200 }),
      }),
    } as any;

    const mockCallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    return new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: (val) => {
          try {
            expect(val).toEqual({
              success: true,
              statusCode: 200,
              message: 'Success',
              data: { foo: 'bar' },
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        error: reject,
      });
    });
  });

  it('should pass through GraphQL responses directly to let Apollo plugin handle it', async () => {
    const interceptor = new TransformResponseInterceptor();

    const mockExecutionContext = {
      getType: vi.fn().mockReturnValue('graphql'),
    } as any;

    const mockCallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    return new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: (val) => {
          try {
            expect(val).toEqual({ foo: 'bar' });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        error: reject,
      });
    });
  });
});
