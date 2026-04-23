// Yandex Cloud Function entry point.
//
// Yandex Cloud Functions invoked through API Gateway receive an event with
// this (approximate) shape:
//   {
//     httpMethod: "POST",
//     path: "/analyze/text",
//     queryStringParameters: { ... },
//     headers: { ... },
//     body: "{...}" | base64,
//     isBase64Encoded: boolean
//   }
//
// See: https://yandex.cloud/en/docs/functions/concepts/function-invoke#http
// and: https://yandex.cloud/en/docs/api-gateway/concepts/extensions/cloud-functions

import { loadConfig } from "./config.js";
import { route } from "./router.js";

interface YandexEvent {
  httpMethod?: string;
  path?: string;
  url?: string;
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
}

interface YandexResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export const handler = async (
  event: YandexEvent,
  _context: unknown,
): Promise<YandexResponse> => {
  const config = loadConfig();

  const rawBody =
    typeof event.body === "string"
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body
      : "";

  let parsedBody: unknown = null;
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON body." }),
      };
    }
  }

  const res = await route(
    {
      method: event.httpMethod ?? "GET",
      path: event.path ?? event.url ?? "/",
      query: event.queryStringParameters ?? {},
      headers: event.headers ?? {},
      body: parsedBody,
    },
    config,
  );

  return {
    statusCode: res.status,
    headers: res.headers,
    body: res.body,
  };
};

export default handler;
