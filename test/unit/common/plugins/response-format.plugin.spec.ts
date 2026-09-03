import { describe, expect, it } from 'vitest';
import { ResponseFormatPlugin } from '../../../../src/common/plugins/response-format.plugin.js';

describe('ResponseFormatPlugin', () => {
  it('should format successful GraphQL single response with success, statusCode, and message', async () => {
    const plugin = new ResponseFormatPlugin();
    const listener = await plugin.requestDidStart({} as any);

    const singleResult: Record<string, any> = {
      data: {
        login: {
          accessToken: 'token123',
        },
      },
    };

    const requestContext = {
      response: {
        body: {
          kind: 'single',
          singleResult,
        },
      },
    } as any;

    await listener.willSendResponse?.(requestContext);

    expect(singleResult.success).toBe(true);
    expect(singleResult.statusCode).toBe(200);
    expect(singleResult.message).toBe('Success');
    expect(singleResult.data).toEqual({
      login: {
        accessToken: 'token123',
      },
    });
  });

  it('should format error GraphQL single response with success, statusCode, and message', async () => {
    const plugin = new ResponseFormatPlugin();
    const listener = await plugin.requestDidStart({} as any);

    const singleResult: Record<string, any> = {
      errors: [
        {
          message: 'Invalid email or password',
          statusCode: 401,
        },
      ],
      data: null,
    };

    const requestContext = {
      response: {
        body: {
          kind: 'single',
          singleResult,
        },
      },
    } as any;

    await listener.willSendResponse?.(requestContext);

    expect(singleResult.success).toBe(false);
    expect(singleResult.statusCode).toBe(401);
    expect(singleResult.message).toBe('Invalid email or password');
    expect(singleResult.data).toBeNull();
  });
});
