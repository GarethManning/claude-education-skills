import { test, expect } from "@playwright/test";
import { createHmac, createHash } from "node:crypto";
import { HOSTED_MCP_ACCESS_SIGNUP_URL } from "../src/access.js";
import {
  createSignedAccessToken,
  getSignedAccessTokenExpiresInSeconds,
  getAuthorizedTokenPrefix,
  getUnauthorizedResponse,
  hasConfiguredAuth,
} from "../src/http-auth.js";
import {
  authorizationPage,
  authorizationServerMetadata,
  createAuthorizationCode,
  dynamicClientRegistrationResponse,
  protectedResourceMetadata,
  publicBaseUrl,
  verifyAuthorizationCode,
} from "../src/oauth.js";

function signedToken(secret: string, nonce = "test-nonce") {
  const payload = `eas_live_${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

test.describe("HTTP MCP auth", () => {
  test("fast-fails anonymous requests with OAuth protected resource metadata", () => {
    const response = getUnauthorizedResponse("https://example.com/mcp", "GET", "https://example.com/.well-known/oauth-protected-resource/mcp");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("resource_metadata");
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toContain("OAuth authorization");
  });

  test("accepts a signed bearer token generated from the shared signing secret", () => {
    const token = signedToken("test-secret");
    const prefix = getAuthorizedTokenPrefix({
      url: "https://example.com/mcp",
      authorization: `Bearer ${token}`,
      env: { MCP_TOKEN_SIGNING_SECRET: "test-secret" },
    });

    expect(prefix).toBe("eas_live_test-nonc");
  });

  test("rejects access tokens in query parameters", () => {
    const token = signedToken("test-secret", "query-token");
    const prefix = getAuthorizedTokenPrefix({
      url: `https://example.com/mcp?token=${encodeURIComponent(token)}`,
      authorization: undefined,
      env: { MCP_TOKEN_SIGNING_SECRET: "test-secret" },
    });

    expect(prefix).toBeNull();
  });

  test("rejects invalid signed tokens", () => {
    const token = signedToken("wrong-secret");
    const prefix = getAuthorizedTokenPrefix({
      url: "https://example.com/mcp",
      authorization: `Bearer ${token}`,
      env: { MCP_TOKEN_SIGNING_SECRET: "test-secret" },
    });

    expect(prefix).toBeNull();
  });

  test("rejects signed tokens with malformed expiry claims", () => {
    const token = signedToken("test-secret", "nonce.not-valid-claims");
    const prefix = getAuthorizedTokenPrefix({
      authorization: `Bearer ${token}`,
      env: { MCP_TOKEN_SIGNING_SECRET: "test-secret" },
    });

    expect(prefix).toBeNull();
  });

  test("accepts pre-hashed tokens for emergency/manual issuance", () => {
    const token = "eas_live_manual_token";
    const hash = createHash("sha256").update(token).digest("hex");
    const prefix = getAuthorizedTokenPrefix({
      url: "https://example.com/mcp",
      authorization: `Bearer ${token}`,
      env: { MCP_ACCESS_TOKEN_HASHES: hash },
    });

    expect(prefix).toBe("eas_live_manual_to");
  });

  test("requires at least one configured auth source", () => {
    expect(hasConfiguredAuth({})).toBe(false);
    expect(hasConfiguredAuth({ MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBe(true);
  });
});

test.describe("Claude connector OAuth compatibility", () => {
  test("publishes protected resource metadata and authorization server metadata", () => {
    expect(protectedResourceMetadata("https://example.com")).toMatchObject({
      resource: "https://example.com/mcp",
      authorization_servers: ["https://example.com"],
    });

    expect(authorizationServerMetadata("https://example.com")).toMatchObject({
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/api/oauth/authorize",
      token_endpoint: "https://example.com/api/oauth/token",
      registration_endpoint: "https://example.com/api/oauth/register",
      code_challenge_methods_supported: ["S256"],
    });
  });

  test("supports dynamic client registration", () => {
    const response = dynamicClientRegistrationResponse("https://example.com", {
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
    });

    expect(response.client_id).toBeTruthy();
    expect(response.redirect_uris).toContain("https://claude.ai/api/mcp/auth_callback");
    expect(response.token_endpoint_auth_method).toBe("none");
  });

  test("does not register an untrusted redirect URI", () => {
    const response = dynamicClientRegistrationResponse("https://example.com", {
      redirect_uris: ["https://attacker.example/callback"],
    });

    expect(response.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
  });

  test("exchanges an existing issued token through a PKCE-bound authorization code", () => {
    const token = signedToken("test-secret", "oauth-token");
    const verifier = "test-code-verifier-that-is-at-least-forty-three-characters-long";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const code = createAuthorizationCode({
      token,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" });

    const exchange = {
      verifier,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    };
    const payload = verifyAuthorizationCode(code, exchange, { MCP_TOKEN_SIGNING_SECRET: "test-secret" });
    expect(payload?.token).toBe(token);
    expect(verifyAuthorizationCode(code, { ...exchange, verifier: "wrong-verifier" }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBeNull();
    expect(verifyAuthorizationCode(code, { ...exchange, redirectUri: "https://attacker.example/callback" }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBeNull();
    expect(verifyAuthorizationCode(code, { ...exchange, clientId: "different-client" }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBeNull();
  });

  test("rejects a low-entropy PKCE verifier even when its hash matches", () => {
    const token = signedToken("test-secret", "oauth-token");
    const verifier = "short-verifier";
    const code = createAuthorizationCode({
      token,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
      codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
      codeChallengeMethod: "S256",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" });

    expect(verifyAuthorizationCode(code, {
      verifier,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBeNull();
  });

  test("does not expose the bearer token inside the authorization code", () => {
    const token = signedToken("test-secret", "private-bearer-token");
    const verifier = "test-code-verifier-that-is-at-least-forty-three-characters-long";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const code = createAuthorizationCode({
      token,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" });

    for (const segment of code.split(".")) {
      expect(Buffer.from(segment, "base64url").toString("utf8")).not.toContain(token);
    }

    const segments = code.split(".");
    segments[2] = `${segments[2].startsWith("A") ? "B" : "A"}${segments[2].slice(1)}`;
    expect(verifyAuthorizationCode(segments.join("."), {
      verifier,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toBeNull();
  });

  test("refuses to create an authorization code without S256 PKCE", () => {
    const token = signedToken("test-secret", "oauth-token");

    expect(() => createAuthorizationCode({
      token,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      clientId: "claude-ai-custom-connector",
    }, { MCP_TOKEN_SIGNING_SECRET: "test-secret" })).toThrow(/PKCE/i);
  });

  test("expires newly issued access tokens while preserving legacy signed tokens", () => {
    const env = { MCP_TOKEN_SIGNING_SECRET: "test-secret" };
    const now = 1_700_000_000_000;
    const token = createSignedAccessToken(env, now);

    expect(getAuthorizedTokenPrefix({ authorization: `Bearer ${token}`, env, now })).toBeTruthy();
    expect(getSignedAccessTokenExpiresInSeconds(token, now)).toBe(30 * 24 * 60 * 60);
    expect(getAuthorizedTokenPrefix({
      authorization: `Bearer ${token}`,
      env,
      now: now + 30 * 24 * 60 * 60 * 1000 + 1,
    })).toBeNull();
    expect(getAuthorizedTokenPrefix({
      authorization: `Bearer ${signedToken("test-secret", "legacy-token")}`,
      env,
      now: now + 30 * 24 * 60 * 60 * 1000 + 1,
    })).toBeTruthy();
  });

  test("shows a signup link on the Claude authorization page for users without a token", () => {
    const html = authorizationPage(new URLSearchParams());

    expect(html).toContain("Don’t have an access token yet?");
    expect(html).toContain(HOSTED_MCP_ACCESS_SIGNUP_URL);
    expect(html).toContain("Request one using the hosted MCP access form");
    expect(html).not.toContain('name="access_token"');
  });

  test("does not derive public OAuth URLs from request host headers", () => {
    expect(publicBaseUrl({ headers: { host: "attacker.example" } }, {})).toBe(
      "https://mcp-server-sigma-sooty.vercel.app",
    );
    expect(publicBaseUrl(
      { headers: { host: "attacker.example" } },
      { MCP_PUBLIC_BASE_URL: "https://trusted.example/" },
    )).toBe("https://trusted.example");
    expect(publicBaseUrl(
      undefined,
      { MCP_PUBLIC_BASE_URL: "https://user@trusted.example/" },
    )).toBe("https://mcp-server-sigma-sooty.vercel.app");
  });
});
