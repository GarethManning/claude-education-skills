import type { ServerResponse } from "node:http";
import {
  assertHostedMcpConfigured,
  authorizationPage,
  authorizationRequestError,
  createAuthorizationCode,
  isIssuedAccessToken,
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
  res.setHeader("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  try {
    assertHostedMcpConfigured(process.env);
  } catch {
    writeUnavailable(res);
    return;
  }

  if (req.method === "GET") {
    const params = new URL(req.url || "/api/oauth/authorize", "https://example.invalid").searchParams;
    const requestError = authorizationRequestError(params);
    res.writeHead(requestError ? 400 : 200, { "content-type": "text/html; charset=utf-8" });
    res.end(authorizationPage(params, requestError || undefined, !requestError));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "GET, POST" });
    res.end("Method not allowed");
    return;
  }

  let form: URLSearchParams;
  try {
    form = await readFormBody(req, SMALL_REQUEST_BODY_LIMIT_BYTES);
  } catch (error) {
    if (isRequestBodyTooLarge(error)) {
      writeRequestBodyTooLarge(res, error);
      return;
    }
    if (isInvalidRequestBody(error)) {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    throw error;
  }

  const requestError = authorizationRequestError(form);
  if (requestError) {
    res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
    res.end(authorizationPage(form, requestError, false));
    return;
  }

  const accessToken = form.get("access_token")?.trim() || "";
  if (!isIssuedAccessToken(accessToken)) {
    res.writeHead(401, { "content-type": "text/html; charset=utf-8" });
    res.end(authorizationPage(
      form,
      "That access token was not recognized. Paste the token from the Education Agent Skills access email.",
      true,
    ));
    return;
  }

  const redirectUri = form.get("redirect_uri")!;
  const code = createAuthorizationCode({
    token: accessToken,
    redirectUri,
    clientId: form.get("client_id")!,
    codeChallenge: form.get("code_challenge")!,
    codeChallengeMethod: "S256",
  });

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  const state = form.get("state");
  if (state) redirect.searchParams.set("state", state);
  res.writeHead(302, { location: redirect.toString(), "cache-control": "no-store" });
  res.end();
}

function writeUnavailable(res: ServerResponse): void {
  res.writeHead(503, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify({ error: "hosted_mcp_unavailable" }));
}
