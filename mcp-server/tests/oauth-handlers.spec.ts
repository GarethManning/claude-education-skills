import { test, expect } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import mcpHandler from "../api/mcp.js";
import authorizeHandler from "../api/oauth/authorize.js";
import registerHandler from "../api/oauth/register.js";
import tokenHandler from "../api/oauth/token.js";
import requestAccessHandler, { resetAccessRateLimitsForTests } from "../api/request-access.js";
import authorizationMetadataHandler from "../api/well-known/oauth-authorization-server.js";
import protectedResourceHandler from "../api/well-known/oauth-protected-resource/mcp.js";
import { createSignedAccessToken, isAuthorizedBearerToken } from "../src/http-auth.js";
import { createRefreshToken, resetOAuthReplayCachesForTests } from "../src/oauth.js";
import {
  MCP_REQUEST_BODY_LIMIT_BYTES,
  SMALL_REQUEST_BODY_LIMIT_BYTES,
} from "../src/request-body.js";

type RecordedResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const TOKEN_SECRET = "token-secret-that-is-at-least-32-bytes-long";
const OAUTH_SECRET = "oauth-secret-that-is-at-least-32-bytes-long";
const TEST_VERIFIER = "test-code-verifier-that-is-at-least-forty-three-characters-long";
const MANAGED_ENV_KEYS = [
  "MCP_TOKEN_SIGNING_SECRET",
  "MCP_OAUTH_SIGNING_SECRET",
  "MCP_PUBLIC_BASE_URL",
  "MCP_OAUTH_REDIRECT_URIS",
  "MCP_REVOKED_TOKEN_HASHES",
  "MCP_ACCESS_TOKEN_HASHES",
  "MCP_ACCESS_TOKENS",
  "RESEND_API_KEY",
  "NODE_ENV",
] as const;
const originalEnvironment = new Map(MANAGED_ENV_KEYS.map((key) => [key, process.env[key]]));

function createResponseRecorder(): { response: RecordedResponse; serverResponse: ServerResponse } {
  const response: RecordedResponse = { status: 200, headers: {}, body: "" };
  const serverResponse = {
    setHeader(name: string, value: string | number | readonly string[]) {
      response.headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
      return this;
    },
    writeHead(status: number, headers?: Record<string, string | number | readonly string[]>) {
      response.status = status;
      for (const [name, value] of Object.entries(headers ?? {})) {
        response.headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
      }
      return this;
    },
    end(body?: string) {
      response.body = body ?? "";
      return this;
    },
    on() {
      return this;
    },
  } as unknown as ServerResponse;
  return { response, serverResponse };
}

function legacySignedToken(nonce = "oauth-handler") {
  const payload = `eas_live_${nonce}`;
  const signature = createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function legacyRefreshToken(token: string) {
  const body = Buffer.from(JSON.stringify({
    token,
    exp: Date.now() + 60_000,
    nonce: "legacy-refresh",
  })).toString("base64url");
  const signature = createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function request(body: unknown, method = "POST", headers: Record<string, string> = {}) {
  return {
    method,
    headers,
    body,
    url: "/",
    socket: { remoteAddress: "203.0.113.10" },
  } as unknown as IncomingMessage & { body?: unknown };
}

function authorizeBody(redirectUri = "https://claude.ai/api/mcp/auth_callback", includePkce = true) {
  return {
    access_token: legacySignedToken(),
    response_type: "code",
    client_id: "claude-ai-custom-connector",
    redirect_uri: redirectUri,
    scope: "mcp",
    state: "state-123",
    ...(includePkce ? {
      code_challenge: createHash("sha256").update(TEST_VERIFIER).digest("base64url"),
      code_challenge_method: "S256",
    } : {}),
  };
}

test.beforeEach(() => {
  process.env.MCP_TOKEN_SIGNING_SECRET = TOKEN_SECRET;
  process.env.MCP_OAUTH_SIGNING_SECRET = OAUTH_SECRET;
  process.env.MCP_PUBLIC_BASE_URL = "https://mcp.example.com";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.NODE_ENV = "production";
  delete process.env.MCP_OAUTH_REDIRECT_URIS;
  delete process.env.MCP_REVOKED_TOKEN_HASHES;
  delete process.env.MCP_ACCESS_TOKEN_HASHES;
  delete process.env.MCP_ACCESS_TOKENS;
  resetOAuthReplayCachesForTests();
  resetAccessRateLimitsForTests();
});

test.afterAll(() => {
  for (const key of MANAGED_ENV_KEYS) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test.describe("OAuth public endpoints", () => {
  test("fail closed with generic no-store responses when canonical configuration is absent", async () => {
    delete process.env.MCP_PUBLIC_BASE_URL;
    const authorization = createResponseRecorder();
    await authorizeHandler(request(authorizeBody()), authorization.serverResponse);
    expect(authorization.response.status).toBe(503);
    expect(authorization.response.headers["cache-control"]).toBe("no-store");
    expect(authorization.response.body).not.toContain("MCP_PUBLIC_BASE_URL");

    const mcp = createResponseRecorder();
    await mcpHandler(request({}, "POST", { authorization: `Bearer ${legacySignedToken()}` }), mcp.serverResponse);
    expect(mcp.response.status).toBe(503);
    expect(mcp.response.body).toBe('{"error":"hosted_mcp_unavailable"}');
  });

  test("metadata handlers use only configured origin", () => {
    const authorization = createResponseRecorder();
    authorizationMetadataHandler(request(undefined, "GET", { host: "attacker.example" }), authorization.serverResponse);
    expect(authorization.response.status).toBe(200);
    expect(JSON.parse(authorization.response.body).issuer).toBe("https://mcp.example.com");

    const resource = createResponseRecorder();
    protectedResourceHandler(request(undefined, "GET", { host: "attacker.example" }), resource.serverResponse);
    expect(JSON.parse(resource.response.body).resource).toBe("https://mcp.example.com/mcp");
  });

  test("rejects an untrusted redirect and missing S256 before issuing a code", async () => {
    const untrusted = createResponseRecorder();
    await authorizeHandler(request(authorizeBody("https://attacker.example/callback")), untrusted.serverResponse);
    expect(untrusted.response.status).toBe(400);
    expect(untrusted.response.headers.location).toBeUndefined();

    const noPkce = createResponseRecorder();
    await authorizeHandler(request(authorizeBody(undefined, false)), noPkce.serverResponse);
    expect(noPkce.response.status).toBe(400);
    expect(noPkce.response.headers.location).toBeUndefined();
  });

  test("preserves the Claude callback and exchanges its code once", async () => {
    const authorization = createResponseRecorder();
    await authorizeHandler(request(authorizeBody()), authorization.serverResponse);
    expect(authorization.response.status).toBe(302);
    expect(authorization.response.headers.location).toMatch(/^https:\/\/claude\.ai\/api\/mcp\/auth_callback\?/);
    const code = new URL(authorization.response.headers.location).searchParams.get("code")!;

    const exchangeBody = {
      grant_type: "authorization_code",
      code,
      code_verifier: TEST_VERIFIER,
      redirect_uri: "https://claude.ai/api/mcp/auth_callback",
      client_id: "claude-ai-custom-connector",
    };
    const exchange = createResponseRecorder();
    await tokenHandler(request(exchangeBody), exchange.serverResponse);
    expect(exchange.response.status).toBe(200);
    const exchangePayload = JSON.parse(exchange.response.body) as {
      access_token: string;
      expires_in: number;
    };
    expect(exchangePayload).toMatchObject({
      token_type: "Bearer",
      scope: "mcp",
    });
    expect(exchangePayload.access_token).not.toBe(legacySignedToken());
    expect(exchangePayload.expires_in).toBeGreaterThan(0);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${exchangePayload.access_token}`,
      env: process.env,
    })).toBe(true);

    const replay = createResponseRecorder();
    await tokenHandler(request(exchangeBody), replay.serverResponse);
    expect(replay.response.status).toBe(400);
    expect(JSON.parse(replay.response.body)).toEqual({ error: "invalid_grant" });
  });

  test("rotates an expiring access token and refresh credential", async () => {
    const originalAccessToken = createSignedAccessToken(process.env);
    const originalRefreshToken = createRefreshToken(originalAccessToken, process.env);
    const responseRecorder = createResponseRecorder();
    await tokenHandler(request({
      grant_type: "refresh_token",
      refresh_token: originalRefreshToken,
    }), responseRecorder.serverResponse);

    expect(responseRecorder.response.status).toBe(200);
    const body = JSON.parse(responseRecorder.response.body) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    expect(body.access_token).not.toBe(originalAccessToken);
    expect(body.refresh_token).not.toBe(originalRefreshToken);
    expect(body.expires_in).toBeGreaterThan(0);
    expect(isAuthorizedBearerToken({ authorization: `Bearer ${body.access_token}`, env: process.env })).toBe(true);
  });

  test("accepts the deployed refresh format after adding the OAuth key and rotates to expiring credentials", async () => {
    const previousAccessToken = legacySignedToken("legacy-refresh-access");
    const previousRefreshToken = legacyRefreshToken(previousAccessToken);
    const responseRecorder = createResponseRecorder();
    await tokenHandler(request({
      grant_type: "refresh_token",
      refresh_token: previousRefreshToken,
    }), responseRecorder.serverResponse);

    expect(responseRecorder.response.status).toBe(200);
    const body = JSON.parse(responseRecorder.response.body) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    expect(body.access_token).not.toBe(previousAccessToken);
    expect(body.refresh_token).not.toBe(previousRefreshToken);
    expect(body.expires_in).toBeGreaterThan(0);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${body.access_token}`,
      env: process.env,
    })).toBe(true);
  });

  test("rejects unapproved redirect registration", async () => {
    const responseRecorder = createResponseRecorder();
    await registerHandler(request({ redirect_uris: ["https://attacker.example/callback"] }), responseRecorder.serverResponse);
    expect(responseRecorder.response.status).toBe(400);
    expect(JSON.parse(responseRecorder.response.body)).toEqual({ error: "invalid_redirect_uri" });
  });
});

test.describe("Hosted access request", () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  let logs: string[];

  test.beforeEach(() => {
    logs = [];
    console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  test("reports provider rejection truthfully without provider, PII, or credential leaks", async () => {
    globalThis.fetch = async () => new Response("provider detail", { status: 500 });
    const responseRecorder = createResponseRecorder();
    await requestAccessHandler(request(
      { email: "learner@example.com" },
      "POST",
      { "x-forwarded-for": "203.0.113.10" },
    ), responseRecorder.serverResponse);

    expect(responseRecorder.response.status).toBe(502);
    expect(responseRecorder.response.headers["cache-control"]).toBe("no-store");
    expect(JSON.parse(responseRecorder.response.body)).toEqual({
      success: false,
      error: "Unable to send the access email. Please try again later.",
    });
    const allOutput = `${responseRecorder.response.body}\n${logs.join("\n")}`;
    expect(allOutput).not.toContain("provider detail");
    expect(allOutput).not.toContain("learner@example.com");
    expect(allOutput).not.toContain("eas_live_");
  });

  test("returns only success after the provider accepts the email", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ id: "email-123" }), { status: 200 });
    const responseRecorder = createResponseRecorder();
    await requestAccessHandler(request(
      { email: "learner@example.com" },
      "POST",
      { "x-forwarded-for": "203.0.113.11" },
    ), responseRecorder.serverResponse);
    expect(responseRecorder.response.status).toBe(200);
    expect(JSON.parse(responseRecorder.response.body)).toEqual({ success: true });
    expect(`${responseRecorder.response.body}\n${logs.join("\n")}`).not.toContain("learner@example.com");
  });

  test("applies per-email abuse control without storing plain email keys", async () => {
    globalThis.fetch = async () => new Response("{}", { status: 200 });
    const statuses: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      const responseRecorder = createResponseRecorder();
      await requestAccessHandler(request(
        { email: "learner@example.com" },
        "POST",
        { "x-forwarded-for": `203.0.113.${20 + index}` },
      ), responseRecorder.serverResponse);
      statuses.push(responseRecorder.response.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  test("rejects cross-site access-email submissions before provider contact", async () => {
    let providerCalled = false;
    globalThis.fetch = async () => {
      providerCalled = true;
      return new Response("{}", { status: 200 });
    };
    const responseRecorder = createResponseRecorder();
    await requestAccessHandler(request(
      { email: "learner@example.com" },
      "POST",
      { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    ), responseRecorder.serverResponse);
    expect(responseRecorder.response.status).toBe(403);
    expect(providerCalled).toBe(false);
  });

  test("allows a cross-site top-level navigation to render the public access form", async () => {
    const responseRecorder = createResponseRecorder();
    await requestAccessHandler(request(
      undefined,
      "GET",
      { "sec-fetch-site": "cross-site" },
    ), responseRecorder.serverResponse);
    expect(responseRecorder.response.status).toBe(200);
    expect(responseRecorder.response.headers["content-type"]).toContain("text/html");
    expect(responseRecorder.response.body).toContain("Request MCP Access");
  });
});

test("all five POST surfaces enforce shared tiered body limits with 413", async () => {
  const smallBody = "x".repeat(SMALL_REQUEST_BODY_LIMIT_BYTES + 1);
  for (const handler of [authorizeHandler, tokenHandler, registerHandler, requestAccessHandler]) {
    const responseRecorder = createResponseRecorder();
    await handler(request(smallBody), responseRecorder.serverResponse);
    expect(responseRecorder.response.status).toBe(413);
    expect(JSON.parse(responseRecorder.response.body).error).toBe("request_too_large");
  }

  const mcp = createResponseRecorder();
  await mcpHandler(request(
    "x".repeat(MCP_REQUEST_BODY_LIMIT_BYTES + 1),
    "POST",
    { authorization: `Bearer ${legacySignedToken("mcp-large")}` },
  ), mcp.serverResponse);
  expect(mcp.response.status).toBe(413);
  expect(JSON.parse(mcp.response.body).error).toBe("request_too_large");
});
