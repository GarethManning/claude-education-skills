import type { IncomingMessage, ServerResponse } from "node:http";
import {
  authorizationPage,
  authorizationRequestError,
  createAuthorizationCode,
  isIssuedAccessToken,
} from "../../src/oauth.js";

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<URLSearchParams> {
  if (typeof req.body === "string") return new URLSearchParams(req.body);
  if (req.body && typeof req.body === "object") return new URLSearchParams(req.body as Record<string, string>);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method === "GET") {
    const url = new URL(req.url || "/api/oauth/authorize", "https://example.invalid");
    const requestError = authorizationRequestError(url.searchParams);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.writeHead(requestError ? 400 : 200, { "cache-control": "no-store" });
    res.end(
      requestError
        ? authorizationPage(new URLSearchParams(), requestError)
        : authorizationPage(url.searchParams),
    );
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "GET, POST" });
    res.end("Method not allowed");
    return;
  }

  const form = await readBody(req);
  const accessToken = form.get("access_token")?.trim() || "";
  const redirectUri = form.get("redirect_uri")?.trim() || "";
  const clientId = form.get("client_id")?.trim() || "claude-ai-custom-connector";
  const state = form.get("state") || "";
  const responseType = form.get("response_type") || "code";

  const requestError = authorizationRequestError(form);
  if (requestError || responseType !== "code" || !redirectUri) {
    res.writeHead(400, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(authorizationPage(new URLSearchParams(), requestError || "Invalid OAuth request from client."));
    return;
  }

  if (!isIssuedAccessToken(accessToken)) {
    res.writeHead(401, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(authorizationPage(form, "That access token was not recognized. Paste the token from the Education Agent Skills access email."));
    return;
  }

  let code: string;
  try {
    code = createAuthorizationCode({
      token: accessToken,
      redirectUri,
      clientId,
      codeChallenge: form.get("code_challenge") || undefined,
      codeChallengeMethod: form.get("code_challenge_method") || undefined,
    });
  } catch {
    res.writeHead(500, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(authorizationPage(new URLSearchParams(), "Unable to complete authorization."));
    return;
  }

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  res.writeHead(302, { location: redirect.toString(), "cache-control": "no-store" });
  res.end();
}
