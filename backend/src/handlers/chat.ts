import Anthropic from "@anthropic-ai/sdk";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const client = new Anthropic();

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 16000;

interface ChatRequestBody {
  messages: Anthropic.MessageParam[];
  system?: string;
  model?: string;
  max_tokens?: number;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return jsonResponse(400, { error: "Request body required" });
  }

  let body: ChatRequestBody;
  try {
    body = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse(400, { error: "'messages' must be a non-empty array" });
  }

  try {
    const response = await client.messages.create({
      model: body.model ?? DEFAULT_MODEL,
      max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
      system: body.system
        ? [
            {
              type: "text",
              text: body.system,
              cache_control: { type: "ephemeral" },
            },
          ]
        : undefined,
      messages: body.messages,
    });

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return jsonResponse(error.status ?? 500, {
        error: error.message,
        type: error.name,
      });
    }
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const jsonResponse = (
  statusCode: number,
  body: unknown,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
