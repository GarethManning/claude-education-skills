import { test, expect } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import { HOSTED_MCP_ACCESS_SIGNUP_URL } from "../src/access.js";
import {
  createSignedAccessToken,
  credentialSha256,
  isAuthorizedBearerToken,
  getSignedAccessTokenExpiresInSeconds,
  getUnauthorizedResponse,
  hasConfiguredAuth,
} from "../src/http-auth.js";
import {
  authorizationPage,
  authorizationRequestError,
  authorizationServerMetadata,
  createAuthorizationCode,
  createRefreshToken,
  dynamicClientRegistrationResponse,
  getHostedMcpConfigurationError,
  protectedResourceMetadata,
  publicBaseUrl,
  resetOAuthReplayCachesForTests,
  verifyAuthorizationCode,
  verifyRefreshToken,
  type OAuthEnv,
} from "../src/oauth.js";

const TOKEN_SECRET = "token-secret-that-is-at-least-32-bytes-long";
const OAUTH_SECRET = "oauth-secret-that-is-at-least-32-bytes-long";
const BASE_ENV: OAuthEnv = {
  MCP_TOKEN_SIGNING_SECRET: TOKEN_SECRET,
  MCP_OAUTH_SIGNING_SECRET: OAUTH_SECRET,
  MCP_PUBLIC_BASE_URL: "https://mcp.example.com",
  NODE_ENV: "production",
};
const VERIFIER = "test-code-verifier-that-is-at-least-forty-three-characters-long";

function legacySignedToken(secret = TOKEN_SECRET, nonce = "test-nonce") {
  const payload = `eas_live_${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function legacyRefreshToken(token: string, secret = TOKEN_SECRET) {
  const body = Buffer.from(JSON.stringify({
    token,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    nonce: "legacy-refresh",
  }), "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

function codeInput(token: string) {
  return {
    token,
    redirectUri: "https://claude.ai/api/mcp/auth_callback",
    clientId: "claude-ai-custom-connector",
    codeChallenge: createHash("sha256").update(VERIFIER).digest("base64url"),
    codeChallengeMethod: "S256" as const,
  };
}

test.beforeEach(() => resetOAuthReplayCachesForTests());

test.describe("HTTP MCP auth", () => {
  test("fast-fails anonymous requests with a no-store OAuth challenge", () => {
    const response = getUnauthorizedResponse(
      "https://example.com/mcp",
      "GET",
      "https://example.com/.well-known/oauth-protected-resource/mcp",
    );

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("resource_metadata");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toContain("OAuth authorization");
  });

  test("accepts legacy signed, hashed, and plain bearer tokens", () => {
    const legacy = legacySignedToken();
    expect(isAuthorizedBearerToken({ authorization: `Bearer ${legacy}`, env: BASE_ENV })).toBe(true);

    const manual = "eas_live_manual_token";
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${manual}`,
      env: { ...BASE_ENV, MCP_ACCESS_TOKEN_HASHES: credentialSha256(manual) },
    })).toBe(true);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${manual}`,
      env: { ...BASE_ENV, MCP_ACCESS_TOKENS: manual },
    })).toBe(true);
  });

  test("accepts bearer credentials only from the Authorization header", () => {
    const token = legacySignedToken(TOKEN_SECRET, "query-token");
    expect(isAuthorizedBearerToken({
      url: `https://example.com/mcp?token=${encodeURIComponent(token)}`,
      env: BASE_ENV,
    })).toBe(false);
    expect(isAuthorizedBearerToken({ authorization: `Bearer ${token}`, env: BASE_ENV })).toBe(true);
  });

  test("expires newly issued access tokens while preserving legacy tokens", () => {
    const now = 1_700_000_000_000;
    const token = createSignedAccessToken(BASE_ENV, now);

    expect(isAuthorizedBearerToken({ authorization: `Bearer ${token}`, env: BASE_ENV, now })).toBe(true);
    expect(getSignedAccessTokenExpiresInSeconds(token, now)).toBe(30 * 24 * 60 * 60);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${token}`,
      env: BASE_ENV,
      now: now + 30 * 24 * 60 * 60 * 1000 + 1,
    })).toBe(false);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${legacySignedToken()}`,
      env: BASE_ENV,
      now: now + 31 * 24 * 60 * 60 * 1000,
    })).toBe(true);
  });

  test("revokes one credential by SHA-256 without rotating global secrets", () => {
    const revoked = legacySignedToken(TOKEN_SECRET, "revoked");
    const retained = legacySignedToken(TOKEN_SECRET, "retained");
    const env = { ...BASE_ENV, MCP_REVOKED_TOKEN_HASHES: credentialSha256(revoked) };

    expect(isAuthorizedBearerToken({ authorization: `Bearer ${revoked}`, env })).toBe(false);
    expect(isAuthorizedBearerToken({ authorization: `Bearer ${retained}`, env })).toBe(true);
    expect(isAuthorizedBearerToken({
      authorization: `Bearer ${retained}`,
      env: { ...env, MCP_REVOKED_TOKEN_HASHES: "not-a-sha256-hash" },
    })).toBe(false);
  });

  test("requires at least one configured auth source", () => {
    expect(hasConfiguredAuth({})).toBe(false);
    expect(hasConfiguredAuth({ MCP_TOKEN_SIGNING_SECRET: TOKEN_SECRET })).toBe(true);
  });
});

test.describe("Hosted OAuth configuration", () => {
  test("fails closed without a strong token secret and canonical public origin", () => {
    expect(getHostedMcpConfigurationError({})).toContain("MCP_TOKEN_SIGNING_SECRET");
    expect(getHostedMcpConfigurationError({
      MCP_TOKEN_SIGNING_SECRET: TOKEN_SECRET,
    })).toContain("MCP_PUBLIC_BASE_URL");
    expect(getHostedMcpConfigurationError({
      MCP_TOKEN_SIGNING_SECRET: TOKEN_SECRET,
      MCP_PUBLIC_BASE_URL: "https://example.com/path",
    })).toContain("canonical public origin");
    expect(() => publicBaseUrl({ headers: { host: "attacker.example" } }, {})).toThrow();
  });

  test("uses only the configured origin and ignores request Host headers", () => {
    expect(publicBaseUrl({ headers: { host: "attacker.example" } }, BASE_ENV)).toBe(
      "https://mcp.example.com",
    );
  });

  test("publishes header-only protected resource and S256 OAuth metadata", () => {
    expect(protectedResourceMetadata("https://mcp.example.com")).toMatchObject({
      resource: "https://mcp.example.com/mcp",
      authorization_servers: ["https://mcp.example.com"],
      bearer_methods_supported: ["header"],
    });
    expect(authorizationServerMetadata("https://mcp.example.com")).toMatchObject({
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
    });
  });
});

test.describe("Claude connector OAuth compatibility and abuse resistance", () => {
  test("preserves Claude registration and rejects unapproved callbacks", () => {
    const response = dynamicClientRegistrationResponse("https://mcp.example.com", {
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
    }, BASE_ENV);
    expect(response.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
    expect(response.token_endpoint_auth_method).toBe("none");
    expect(() => dynamicClientRegistrationResponse("https://mcp.example.com", {
      redirect_uris: ["https://attacker.example/callback"],
    }, BASE_ENV)).toThrow(/redirect/i);
  });

  test("requires the exact client, approved redirect, and S256 challenge", () => {
    const valid = new URLSearchParams({
      response_type: "code",
      client_id: "claude-ai-custom-connector",
      redirect_uri: "https://claude.ai/api/mcp/auth_callback",
      code_challenge: createHash("sha256").update(VERIFIER).digest("base64url"),
      code_challenge_method: "S256",
      scope: "mcp",
    });
    expect(authorizationRequestError(valid, BASE_ENV)).toBeNull();
    valid.set("redirect_uri", "https://attacker.example/callback");
    expect(authorizationRequestError(valid, BASE_ENV)).toContain("redirect");
    valid.set("redirect_uri", "https://claude.ai/api/mcp/auth_callback");
    valid.delete("code_challenge_method");
    expect(authorizationRequestError(valid, BASE_ENV)).toContain("S256");
  });

  test("uses opaque authenticated codes bound to PKCE, redirect, and client and consumes them once", () => {
    const token = legacySignedToken(TOKEN_SECRET, "private-bearer-token");
    const code = createAuthorizationCode(codeInput(token), BASE_ENV);
    for (const segment of code.split(".")) {
      expect(Buffer.from(segment, "base64url").toString("utf8")).not.toContain(token);
    }

    const exchange = {
      verifier: VERIFIER,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    };
    expect(verifyAuthorizationCode(code, { ...exchange, verifier: "wrong-verifier-that-is-still-long-enough-000000" }, BASE_ENV)).toBeNull();
    expect(verifyAuthorizationCode(code, { ...exchange, redirectUri: "https://attacker.example/callback" }, BASE_ENV)).toBeNull();
    expect(verifyAuthorizationCode(code, { ...exchange, clientId: "different-client" }, BASE_ENV)).toBeNull();
    expect(verifyAuthorizationCode(code, exchange, BASE_ENV)?.token).toBe(token);
    expect(verifyAuthorizationCode(code, exchange, BASE_ENV)).toBeNull();
  });

  test("rejects tampered and expired authorization codes", () => {
    const now = 1_700_000_000_000;
    const code = createAuthorizationCode(codeInput(legacySignedToken()), BASE_ENV, now);
    const parts = code.split(".");
    parts[2] = `${parts[2].startsWith("A") ? "B" : "A"}${parts[2].slice(1)}`;
    const exchange = {
      verifier: VERIFIER,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    };
    expect(verifyAuthorizationCode(parts.join("."), exchange, BASE_ENV, now)).toBeNull();
    expect(verifyAuthorizationCode(code, exchange, BASE_ENV, now + 10 * 60 * 1000 + 1)).toBeNull();
  });

  test("dual-verifies old refresh tokens after adding a dedicated OAuth key", () => {
    const oldEnv = { ...BASE_ENV, MCP_OAUTH_SIGNING_SECRET: undefined };
    const token = createSignedAccessToken(oldEnv);
    const deployedFormat = legacyRefreshToken(token);
    expect(verifyRefreshToken(deployedFormat, BASE_ENV)).toBe(token);

    resetOAuthReplayCachesForTests();
    const encryptedWithOldKey = createRefreshToken(token, oldEnv);
    expect(verifyRefreshToken(encryptedWithOldKey, BASE_ENV)).toBe(token);
  });

  test("consumes refresh tokens once and supports individual refresh revocation", () => {
    const token = createSignedAccessToken(BASE_ENV);
    const refreshToken = createRefreshToken(token, BASE_ENV);
    for (const segment of refreshToken.split(".")) {
      expect(Buffer.from(segment, "base64url").toString("utf8")).not.toContain(token);
    }
    expect(verifyRefreshToken(refreshToken, BASE_ENV)).toBe(token);
    expect(verifyRefreshToken(refreshToken, BASE_ENV)).toBeNull();

    resetOAuthReplayCachesForTests();
    const revoked = createRefreshToken(token, BASE_ENV);
    expect(verifyRefreshToken(revoked, {
      ...BASE_ENV,
      MCP_REVOKED_TOKEN_HASHES: credentialSha256(revoked),
    })).toBeNull();
  });

  test("shows the signup link but no credential form without a validated request", () => {
    const html = authorizationPage(new URLSearchParams());
    expect(html).toContain(HOSTED_MCP_ACCESS_SIGNUP_URL);
    expect(html).not.toContain('name="access_token"');
  });
});
