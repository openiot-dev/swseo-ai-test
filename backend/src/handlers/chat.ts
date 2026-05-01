import OpenAI from "openai";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const client = new OpenAI();

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 16000;

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
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

  const messages = body.system
    ? [{ role: "system" as const, content: body.system }, ...body.messages]
    : body.messages;

  try {
    const response = await client.chat.completions.create({
      model: body.model ?? DEFAULT_MODEL,
      max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
      messages,
    });

    const reply = response.choices[0]?.message?.content?.trim() ?? "";

    return jsonResponse(200, { reply, raw: response });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
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
