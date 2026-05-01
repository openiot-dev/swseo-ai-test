import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const name = event.queryStringParameters?.name ?? "world";

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `Hello, ${name}!`,
      path: event.requestContext.http.path,
      method: event.requestContext.http.method,
    }),
  };
};
