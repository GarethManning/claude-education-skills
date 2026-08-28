import type { ServerResponse } from "node:http";
import {
  createSignedAccessToken,
  getSignedAccessTokenExpiresInSeconds,
} from "../../src/http-auth.js";
import {
  assertHostedMcpConfigured,
  createRefreshToken,
  verifyAuthorizationCode,
  verifyRefreshToken,
} from "../../src/oauth.js";
import {
  isInvalidRequestBody,
  isRequestBodyTooLarge,
  readFormBody,
  SMALL_REQUEST_BODY_LIMIT_BYTES,
  writeRequestBodyTooLarge,
  type RequestWithBody,
} from "../../src/request-body.js";

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  res.setHeader("cache-control", "no-store");
  try {
    assertHostedMcpConfigured(process.env);
  } catch {
    writeJson(res, 503, { error: "hosted_mcp_unavailable" });
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" });
    res.end("Method not allowed");
    return;
  }

  let body: URLSearchParams;
  try {
    body = await readFormBody(req, SMALL_REQUEST_BODY_LIMIT_BYTES);
  } catch (error) {
    if (isRequestBodyTooLarge(error)) {
      writeRequestBodyTooLarge(res, error);
      return;
    }
    if (isInvalidRequestBody(error)) {
      writeJson(res, 400, { error: "invalid_request" });
      return;
    }
    throw error;
  }

  const grantType = body.get("grant_type");
  let accessToken: string | null = null;

  if (grantType === "authorization_code") {
    const payload = verifyAuthorizationCode(body.get("code") || "", {
      verifier: body.get("code_verifier") || "",
      redirectUri: body.get("redirect_uri") || "",
      clientId: body.get("client_id") || "",
    });
    if (payload) accessToken = createSignedAccessToken(process.env);
  } else if (grantType === "refresh_token") {
    const previousAccessToken = verifyRefreshToken(body.get("refresh_token") || "");
    if (previousAccessToken) accessToken = createSignedAccessToken(process.env);
  } else {
    writeJson(res, 400, { error: "unsupported_grant_type" });
    return;
  }

  if (!accessToken) {
    writeJson(res, 400, { error: "invalid_grant" });
    return;
  }

  const response: Record<string, unknown> = {
    access_token: accessToken,
    token_type: "Bearer",
    refresh_token: createRefreshToken(accessToken),
    scope: "mcp",
  };
  const expiresIn = getSignedAccessTokenExpiresInSeconds(accessToken);
  if (expiresIn !== undefined) response.expires_in = expiresIn;
  writeJson(res, 200, response);
}

function writeJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}
