import { test, expect } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import authorizeHandler from "../api/oauth/authorize.js";
import tokenHandler from "../api/oauth/token.js";
import requestAccessHandler from "../api/request-access.js";
import {
  createSignedAccessToken,
  getAuthorizedTokenPrefix,
} from "../src/http-auth.js";
import { createRefreshToken } from "../src/oauth.js";

type RecordedResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

function createResponseRecorder(): {
  response: RecordedResponse;
  serverResponse: ServerResponse;
} {
  const response: RecordedResponse = { status: 200, headers: {}, body: "" };
  const serverResponse = {
    setHeader(name: string, value: string) {
      response.headers[name.toLowerCase()] = value;
    },
    writeHead(status: number, headers?: Record<string, string>) {
      response.status = status;
      for (const [name, value] of Object.entries(headers ?? {})) {
        response.headers[name.toLowerCase()] = value;
      }
      return this;
    },
    end(body?: string) {
      response.body = body ?? "";
      return this;
    },
  } as unknown as ServerResponse;

  return { response, serverResponse };
}

function signedToken(secret: string, nonce: string) {
  const payload = `eas_live_${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

const TEST_VERIFIER = "test-code-verifier-that-is-at-least-forty-three-characters-long";

function authorizeRequest(redirectUri: string, includePkce = true): IncomingMessage & { body: unknown } {
  return {
    method: "POST",
    body: {
      access_token: signedToken("test-secret", "oauth-handler"),
      response_type: "code",
      client_id: "claude-ai-custom-connector",
      redirect_uri: redirectUri,
      state: "state-123",
      ...(includePkce
        ? {
            code_challenge: createHash("sha256").update(TEST_VERIFIER).digest("base64url"),
            code_challenge_method: "S256",
          }
        : {}),
    },
  } as unknown as IncomingMessage & { body: unknown };
}

test.describe("OAuth authorization endpoint", () => {
  test.beforeEach(() => {
    process.env.MCP_TOKEN_SIGNING_SECRET = "test-secret";
  });

  test.afterEach(() => {
    delete process.env.MCP_TOKEN_SIGNING_SECRET;
  });

  test("rejects an untrusted redirect URI before issuing a code", async () => {
    const { response, serverResponse } = createResponseRecorder();

    await authorizeHandler(authorizeRequest("https://attacker.example/callback"), serverResponse);

    expect(response.status).toBe(400);
    expect(response.headers.location).toBeUndefined();
  });

  test("requires S256 PKCE", async () => {
    const { response, serverResponse } = createResponseRecorder();

    await authorizeHandler(
      authorizeRequest("https://claude.ai/api/mcp/auth_callback", false),
      serverResponse,
    );

    expect(response.status).toBe(400);
    expect(response.headers.location).toBeUndefined();
  });

  test("preserves the supported Claude callback flow", async () => {
    const { response, serverResponse } = createResponseRecorder();

    await authorizeHandler(
      authorizeRequest("https://claude.ai/api/mcp/auth_callback"),
      serverResponse,
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^https:\/\/claude\.ai\/api\/mcp\/auth_callback\?/);
  });
});

test.describe("Hosted access request endpoint", () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  let errorLogs: string[];

  test.beforeEach(() => {
    process.env.MCP_TOKEN_SIGNING_SECRET = "test-secret";
    process.env.RESEND_API_KEY = "test-resend-key";
    errorLogs = [];
    console.error = (...args: unknown[]) => errorLogs.push(args.map(String).join(" "));
    console.log = () => {};
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    delete process.env.MCP_TOKEN_SIGNING_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  test("reports email delivery failure without exposing provider details", async () => {
    globalThis.fetch = async () => new Response("provider detail", { status: 500 });
    const { response, serverResponse } = createResponseRecorder();
    const request = {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10" },
      body: { email: "learner@example.com" },
    } as unknown as IncomingMessage & { body: unknown };

    await requestAccessHandler(request, serverResponse);

    expect(response.status).toBe(502);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      error: "Unable to send the access email. Please try again later.",
    });
    expect(response.body).not.toContain("provider detail");
    expect(errorLogs.join("\n")).not.toContain("provider detail");
    expect(errorLogs.join("\n")).not.toContain("learner@example.com");
  });

  test("returns success after the access email is accepted", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: "email-123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const { response, serverResponse } = createResponseRecorder();
    const request = {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.11" },
      body: { email: "learner@example.com" },
    } as unknown as IncomingMessage & { body: unknown };

    await requestAccessHandler(request, serverResponse);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(JSON.parse(response.body)).toMatchObject({ success: true });
  });

  test("does not expose internal configuration details", async () => {
    delete process.env.MCP_TOKEN_SIGNING_SECRET;
    const { response, serverResponse } = createResponseRecorder();
    const request = {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.12" },
      body: { email: "learner@example.com" },
    } as unknown as IncomingMessage & { body: unknown };

    await requestAccessHandler(request, serverResponse);

    expect(response.status).toBe(503);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      error: "Hosted access is temporarily unavailable. Please try again later.",
    });
    expect(response.body).not.toContain("MCP_TOKEN_SIGNING_SECRET");
  });
});

test.describe("OAuth token endpoint", () => {
  test.beforeEach(() => {
    process.env.MCP_TOKEN_SIGNING_SECRET = "test-secret";
  });

  test.afterEach(() => {
    delete process.env.MCP_TOKEN_SIGNING_SECRET;
  });

  test("rotates an expiring access token during refresh", async () => {
    const originalAccessToken = createSignedAccessToken(process.env);
    const refreshToken = createRefreshToken(originalAccessToken, process.env);
    const { response, serverResponse } = createResponseRecorder();
    const request = {
      method: "POST",
      body: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    } as unknown as IncomingMessage & { body: unknown };

    await tokenHandler(request, serverResponse);

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body) as {
      access_token: string;
      expires_in: number;
      refresh_token: string;
    };
    expect(body.access_token).not.toBe(originalAccessToken);
    expect(body.expires_in).toBeGreaterThan(0);
    expect(body.refresh_token).not.toBe(refreshToken);
    expect(getAuthorizedTokenPrefix({
      authorization: `Bearer ${body.access_token}`,
      env: process.env,
    })).toBeTruthy();
  });

  test("completes the supported authorization-code flow through both handlers", async () => {
    const authorization = createResponseRecorder();
    await authorizeHandler(
      authorizeRequest("https://claude.ai/api/mcp/auth_callback"),
      authorization.serverResponse,
    );
    expect(authorization.response.status).toBe(302);
    const code = new URL(authorization.response.headers.location).searchParams.get("code");
    expect(code).toBeTruthy();

    const exchange = createResponseRecorder();
    const request = {
      method: "POST",
      body: {
        grant_type: "authorization_code",
        code: code!,
        code_verifier: TEST_VERIFIER,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        client_id: "claude-ai-custom-connector",
      },
    } as unknown as IncomingMessage & { body: unknown };
    await tokenHandler(request, exchange.serverResponse);

    expect(exchange.response.status).toBe(200);
    expect(JSON.parse(exchange.response.body)).toMatchObject({
      access_token: signedToken("test-secret", "oauth-handler"),
      token_type: "Bearer",
      scope: "mcp",
    });
  });

  test("can refresh an authentic access token after its access expiry", async () => {
    const expiredAccessToken = createSignedAccessToken(
      process.env,
      Date.now() - 31 * 24 * 60 * 60 * 1000,
    );
    const refreshToken = createRefreshToken(expiredAccessToken, process.env);
    const { response, serverResponse } = createResponseRecorder();
    const request = {
      method: "POST",
      body: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    } as unknown as IncomingMessage & { body: unknown };

    await tokenHandler(request, serverResponse);

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body) as { access_token: string };
    expect(body.access_token).not.toBe(expiredAccessToken);
    expect(getAuthorizedTokenPrefix({
      authorization: `Bearer ${body.access_token}`,
      env: process.env,
    })).toBeTruthy();
  });
});
