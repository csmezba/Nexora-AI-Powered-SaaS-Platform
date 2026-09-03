import { describe, expect, it, vi } from 'vitest';
import { ResponseTransformMiddleware } from '../../../../src/common/middlewares/response-transform.middleware.js';

describe('ResponseTransformMiddleware', () => {
  it('should transform success json response', () => {
    const middleware = new ResponseTransformMiddleware();
    const mockOriginalJson = vi.fn();
    const req = {} as any;
    const res = {
      json: mockOriginalJson,
      send: vi.fn(),
      statusCode: 200,
    } as any;
    const next = vi.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    res.json({
      data: {
        login: {
          accessToken: 'jwt.token',
        },
      },
    });

    expect(mockOriginalJson).toHaveBeenCalledWith({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        login: {
          accessToken: 'jwt.token',
        },
      },
    });
  });

  it('should transform success send string response from GraphQL execution', () => {
    const middleware = new ResponseTransformMiddleware();
    const mockOriginalSend = vi.fn();
    const req = {} as any;
    const res = {
      json: vi.fn(),
      send: mockOriginalSend,
      statusCode: 200,
    } as any;
    const next = vi.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    res.send(
      JSON.stringify({
        data: {
          login: {
            accessToken: 'jwt.token',
          },
        },
      }),
    );

    expect(mockOriginalSend).toHaveBeenCalled();
    const sentData = JSON.parse(mockOriginalSend.mock.calls[0][0]);
    expect(sentData).toEqual({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        login: {
          accessToken: 'jwt.token',
        },
      },
    });
  });

  it('should transform error response string from GraphQL execution', () => {
    const middleware = new ResponseTransformMiddleware();
    const mockOriginalSend = vi.fn();
    const req = {} as any;
    const res = {
      json: vi.fn(),
      send: mockOriginalSend,
      statusCode: 200,
    } as any;
    const next = vi.fn();

    middleware.use(req, res, next);

    res.send(
      JSON.stringify({
        errors: [
          {
            message: 'Invalid email or password',
            statusCode: 401,
          },
        ],
        data: null,
      }),
    );

    const sentData = JSON.parse(mockOriginalSend.mock.calls[0][0]);
    expect(sentData).toEqual({
      success: false,
      statusCode: 401,
      message: 'Invalid email or password',
      errors: [
        {
          message: 'Invalid email or password',
          statusCode: 401,
        },
      ],
      data: null,
    });
  });
});
