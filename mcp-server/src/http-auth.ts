import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HOSTED_MCP_ACCESS_SIGNUP_URL } from "./access.js";

export type AuthEnv = Record<string, string | undefined>;

export type AuthCheckInput = {
  url?: string;
  authorization?: string | string[];
  env?: AuthEnv;
  now?: number;
};

export type HttpAuthResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

type ExpiringAccessTokenClaims = {
  version: 1;
  exp: number;
};

export function createSignedAccessToken(
  env: AuthEnv = process.env,
  now = Date.now(),
): string {
  const secret = env.MCP_TOKEN_SIGNING_SECRET?.trim();
  if (!secret) throw new Error("MCP_TOKEN_SIGNING_SECRET is not configured");

  const nonce = randomBytes(24).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ version: 1, exp: now + ACCESS_TOKEN_TTL_MS }),
    "utf8",
  ).toString("base64url");
  const payload = `eas_live_${nonce}.${claims}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function hasConfiguredAuth(env: AuthEnv = process.env): boolean {
  return Boolean(
    env.MCP_TOKEN_SIGNING_SECRET?.trim() ||
      env.MCP_ACCESS_TOKEN_HASHES?.trim() ||
      env.MCP_ACCESS_TOKENS?.trim(),
  );
}

export function hasValidRevocationConfiguration(env: AuthEnv = process.env): boolean {
  return splitList(env.MCP_REVOKED_TOKEN_HASHES).every((hash) => SHA256_HEX_PATTERN.test(hash));
}

export function credentialSha256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isCredentialRevoked(token: string, env: AuthEnv = process.env): boolean {
  const digest = credentialSha256(token);
  return splitList(env.MCP_REVOKED_TOKEN_HASHES).some((hash) => safeEqual(digest, hash.toLowerCase()));
}

export function getUnauthorizedResponse(originUrl: string, method = "POST", metadataUrl?: string): HttpAuthResponse {
  const isGet = method.toUpperCase() === "GET";
  const challenge = metadataUrl
    ? `Bearer resource_metadata="${metadataUrl}"`
    : `Bearer realm="education-agent-skills", error="invalid_token", error_description="Hosted MCP access token required"`;
  return {
    status: 401,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "www-authenticate": challenge,
      "x-mcp-auth": isGet ? "required-fast-fail" : "required",
    },
    body: JSON.stringify({
      error: "Hosted MCP access token required",
      message:
        "This hosted MCP endpoint requires OAuth authorization in Claude.ai. Request an access token, then paste it into the browser authorization screen when Claude connects.",
      requestAccess: HOSTED_MCP_ACCESS_SIGNUP_URL,
      resource: originUrl,
      resourceMetadata: metadataUrl,
    }),
  };
}

export function isAuthorizedBearerToken(input: AuthCheckInput): boolean {
  const env = input.env ?? process.env;
  const token = extractToken(input.authorization);
  if (
    !token ||
    !hasConfiguredAuth(env) ||
    !hasValidRevocationConfiguration(env) ||
    isCredentialRevoked(token, env)
  ) return false;
  if (isSignedTokenValid(token, env.MCP_TOKEN_SIGNING_SECRET, input.now ?? Date.now())) {
    return true;
  }
  if (isHashTokenValid(token, env.MCP_ACCESS_TOKEN_HASHES)) {
    return true;
  }
  if (isPlainTokenValid(token, env.MCP_ACCESS_TOKENS)) {
    return true;
  }
  return false;
}

export function extractToken(authorization?: string | string[]): string | null {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return header?.match(/^Bearer\s+([^\s]+)$/i)?.[1]?.trim() || null;
}

export function getSignedAccessTokenExpiresInSeconds(
  token: string,
  now = Date.now(),
): number | undefined {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return undefined;
  const claims = parseExpiringClaims(token.slice(0, dot));
  if (!claims) return undefined;
  return Math.max(0, Math.ceil((claims.exp - now) / 1000));
}

export function isAuthenticSignedAccessToken(
  token: string,
  env: AuthEnv = process.env,
): boolean {
  return (
    !isCredentialRevoked(token, env) &&
    authenticSignedTokenClaims(token, env.MCP_TOKEN_SIGNING_SECRET) !== undefined
  );
}

function isSignedTokenValid(token: string, secret: string | undefined, now: number): boolean {
  const claims = authenticSignedTokenClaims(token, secret);
  if (claims === undefined) return false;
  return claims === null || claims.exp > now;
}

function authenticSignedTokenClaims(
  token: string,
  secret: string | undefined,
): ExpiringAccessTokenClaims | null | undefined {
  const cleanSecret = secret?.trim();
  if (!cleanSecret) return undefined;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return undefined;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payload.startsWith("eas_live_") || !signature) return undefined;
  const expected = createHmac("sha256", cleanSecret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return undefined;

  const claimsSeparator = payload.indexOf(".", "eas_live_".length);
  if (claimsSeparator < 0) return null;
  return parseExpiringClaims(payload) ?? undefined;
}

function parseExpiringClaims(payload: string): ExpiringAccessTokenClaims | null {
  const claimsSeparator = payload.indexOf(".", "eas_live_".length);
  if (claimsSeparator < 0) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload.slice(claimsSeparator + 1), "base64url").toString("utf8"),
    ) as Partial<ExpiringAccessTokenClaims>;
    if (
      claims.version !== 1 ||
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp)
    ) return null;
    return claims as ExpiringAccessTokenClaims;
  } catch {
    return null;
  }
}

function isHashTokenValid(token: string, hashes?: string): boolean {
  const allowed = splitList(hashes).filter((hash) => SHA256_HEX_PATTERN.test(hash));
  if (allowed.length === 0) return false;
  const digest = credentialSha256(token);
  return allowed.some((hash) => safeEqual(digest, hash.toLowerCase()));
}

function isPlainTokenValid(token: string, tokens?: string): boolean {
  const allowed = splitList(tokens);
  if (allowed.length === 0) return false;
  return allowed.some((allowedToken) => safeEqual(token, allowedToken));
}

function splitList(raw?: string): string[] {
  return (raw ?? "")
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}
