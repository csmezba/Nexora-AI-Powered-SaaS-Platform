import { Plugin } from '@nestjs/apollo';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

@Plugin()
export class ResponseFormatPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return {
      async willSendResponse(requestContext) {
        const { response } = requestContext;
        if (response.body.kind === 'single') {
          const result = response.body.singleResult as any;
          if (result) {
            if (!result.errors || result.errors.length === 0) {
              result.success = true;
              result.statusCode = 200;
              result.message = 'Success';
            } else {
              const firstError = result.errors[0];
              result.success = false;
              result.statusCode = firstError?.statusCode ?? 500;
              result.message = firstError?.message ?? 'An error occurred';
            }
          }
        }
      },
    };
  }
}
