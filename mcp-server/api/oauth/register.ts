import type { ServerResponse } from "node:http";
import { dynamicClientRegistrationResponse, publicBaseUrl } from "../../src/oauth.js";
import {
  isInvalidRequestBody,
  isRequestBodyTooLarge,
  readJsonBody,
  SMALL_REQUEST_BODY_LIMIT_BYTES,
  writeRequestBodyTooLarge,
  type RequestWithBody,
} from "../../src/request-body.js";

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" });
    res.end("Method not allowed");
    return;
  }

  try {
    const baseUrl = publicBaseUrl(req);
    const body = await readJsonBody(req, SMALL_REQUEST_BODY_LIMIT_BYTES);
    const registration = dynamicClientRegistrationResponse(baseUrl, body);
    res.writeHead(201, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(registration));
  } catch (error) {
    if (isRequestBodyTooLarge(error)) {
      writeRequestBodyTooLarge(res, error);
      return;
    }
    if (isInvalidRequestBody(error)) {
      writeJson(res, 400, { error: "invalid_client_metadata" });
      return;
    }
    const message = error instanceof Error ? error.message : "";
    if (/redirect_uris|redirect URI/.test(message)) {
      writeJson(res, 400, { error: "invalid_redirect_uri" });
      return;
    }
    writeJson(res, 503, { error: "hosted_mcp_unavailable" });
  }
}

function writeJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}
