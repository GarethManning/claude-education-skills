import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createRefreshToken,
  DEFAULT_CLIENT_ID,
  verifyAuthorizationCode,
  verifyRefreshToken,
} from "../../src/oauth.js";
import {
  createSignedAccessToken,
  getSignedAccessTokenExpiresInSeconds,
} from "../../src/http-auth.js";

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<URLSearchParams> {
  if (typeof req.body === "string") return new URLSearchParams(req.body);
  if (req.body && typeof req.body === "object") return new URLSearchParams(req.body as Record<string, string>);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" });
    res.end("Method not allowed");
    return;
  }

  const body = await readBody(req);
  const grantType = body.get("grant_type") || "authorization_code";
  let accessToken: string | null = null;

  if (grantType === "authorization_code") {
    const code = body.get("code") || "";
    const payload = verifyAuthorizationCode(code, {
      verifier: body.get("code_verifier") || "",
      redirectUri: body.get("redirect_uri") || "",
      clientId: body.get("client_id") || DEFAULT_CLIENT_ID,
    });
    accessToken = payload?.token || null;
  } else if (grantType === "refresh_token") {
    const previousAccessToken = verifyRefreshToken(body.get("refresh_token") || "");
    accessToken = previousAccessToken && getSignedAccessTokenExpiresInSeconds(previousAccessToken) !== undefined
      ? createSignedAccessToken(process.env)
      : previousAccessToken;
  }

  if (!accessToken) {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ error: "invalid_grant" }));
    return;
  }

  res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  const expiresIn = getSignedAccessTokenExpiresInSeconds(accessToken);
  res.end(JSON.stringify({
    access_token: accessToken,
    token_type: "Bearer",
    ...(expiresIn === undefined ? {} : { expires_in: expiresIn }),
    refresh_token: createRefreshToken(accessToken),
    scope: "mcp",
  }));
}
