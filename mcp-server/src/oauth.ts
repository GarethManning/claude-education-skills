import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { HOSTED_MCP_ACCESS_SIGNUP_URL } from "./access.js";
import {
  isAuthorizedBearerToken,
  hasValidRevocationConfiguration,
  isAuthenticSignedAccessToken,
  isCredentialRevoked,
  type AuthEnv,
} from "./http-auth.js";

export type OAuthEnv = AuthEnv;

export const OAUTH_ISSUER_PATH = "";
export const OAUTH_AUTHORIZE_PATH = "/api/oauth/authorize";
export const OAUTH_TOKEN_PATH = "/api/oauth/token";
export const OAUTH_REGISTER_PATH = "/api/oauth/register";
export const PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource/mcp";
export const AUTH_SERVER_METADATA_PATH = "/.well-known/oauth-authorization-server";

const CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_CODE_VERSION = "eas_code_v1";
const REFRESH_TOKEN_VERSION = "eas_refresh_v2";
const S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
const MIN_SECRET_BYTES = 32;
const MAX_REPLAY_ENTRIES = 10_000;

export const DEFAULT_CLIENT_ID = "claude-ai-custom-connector";
export const DEFAULT_REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

const redeemedAuthorizationCodes = new Map<string, number>();
const redeemedRefreshTokens = new Map<string, number>();

export class OAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthConfigurationError";
  }
}

export type AuthorizationCodePayload = {
  token: string;
  redirectUri: string;
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  exp: number;
};

export type AuthorizationCodeExchange = {
  verifier: string;
  redirectUri: string;
  clientId: string;
};

export function getHostedMcpConfigurationError(
  env: OAuthEnv = process.env,
): string | null {
  const tokenSecret = env.MCP_TOKEN_SIGNING_SECRET?.trim();
  if (!isStrongSecret(tokenSecret)) return "MCP_TOKEN_SIGNING_SECRET must contain at least 32 bytes";

  const dedicatedOAuthSecret = env.MCP_OAUTH_SIGNING_SECRET?.trim();
  if (dedicatedOAuthSecret && !isStrongSecret(dedicatedOAuthSecret)) {
    return "MCP_OAUTH_SIGNING_SECRET must contain at least 32 bytes";
  }
  if (!hasValidRevocationConfiguration(env)) {
    return "MCP_REVOKED_TOKEN_HASHES contains an invalid SHA-256 hash";
  }

  const baseUrl = normalizeBaseUrl(env.MCP_PUBLIC_BASE_URL?.trim() || "", env);
  if (!baseUrl) return "MCP_PUBLIC_BASE_URL must be a canonical public origin";

  const configuredRedirects = splitList(env.MCP_OAUTH_REDIRECT_URIS);
  if (configuredRedirects.some((uri) => !normalizeRedirectUri(uri, env))) {
    return "MCP_OAUTH_REDIRECT_URIS contains an invalid redirect URI";
  }
  return null;
}

export function assertHostedMcpConfigured(env: OAuthEnv = process.env): void {
  const error = getHostedMcpConfigurationError(env);
  if (error) throw new OAuthConfigurationError(error);
}

export function publicBaseUrl(
  _req?: { headers?: Record<string, string | string[] | undefined> },
  env: OAuthEnv = process.env,
): string {
  assertHostedMcpConfigured(env);
  return normalizeBaseUrl(env.MCP_PUBLIC_BASE_URL!.trim(), env)!;
}

export function protectedResourceMetadata(baseUrl: string) {
  return {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  };
}

export function authorizationServerMetadata(baseUrl: string) {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}${OAUTH_AUTHORIZE_PATH}`,
    token_endpoint: `${baseUrl}${OAUTH_TOKEN_PATH}`,
    registration_endpoint: `${baseUrl}${OAUTH_REGISTER_PATH}`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp"],
    client_id_metadata_document_supported: true,
  };
}

export function dynamicClientRegistrationResponse(
  baseUrl: string,
  body: Record<string, unknown> = {},
  env: OAuthEnv = process.env,
) {
  assertHostedMcpConfigured(env);
  const requested = body.redirect_uris;
  if (requested !== undefined && !Array.isArray(requested)) {
    throw new Error("redirect_uris must be an array");
  }
  const requestedRedirectUris = (requested ?? []) as unknown[];
  if (requestedRedirectUris.some((value) => typeof value !== "string" || !isAllowedOAuthRedirectUri(value, env))) {
    throw new Error("Unapproved redirect URI");
  }
  const approvedRedirectUris = requestedRedirectUris.length
    ? requestedRedirectUris.map((uri) => normalizeRedirectUri(String(uri), env)!)
    : [DEFAULT_REDIRECT_URI];

  return {
    client_id: DEFAULT_CLIENT_ID,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: approvedRedirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    client_name: typeof body.client_name === "string" ? body.client_name.slice(0, 200) : "Claude custom connector",
    client_uri: baseUrl,
    scope: "mcp",
  };
}

export function isIssuedAccessToken(token: string, env: OAuthEnv = process.env): boolean {
  return isAuthorizedBearerToken({ authorization: `Bearer ${token}`, env });
}

export function isAllowedOAuthRedirectUri(
  redirectUri: string,
  env: OAuthEnv = process.env,
): boolean {
  const normalized = normalizeRedirectUri(redirectUri, env);
  if (!normalized) return false;
  return allowedRedirectUris(env).has(normalized);
}

export function authorizationRequestError(
  params: URLSearchParams,
  env: OAuthEnv = process.env,
): string | null {
  if (params.get("response_type") !== "code") return "Unsupported response type.";
  if ((params.get("client_id") || "") !== DEFAULT_CLIENT_ID) return "Unknown OAuth client.";
  if (!isAllowedOAuthRedirectUri(params.get("redirect_uri") || "", env)) {
    return "Unapproved redirect URI.";
  }
  if (params.get("code_challenge_method") !== "S256") return "S256 PKCE is required.";
  if (!S256_CHALLENGE_PATTERN.test(params.get("code_challenge") || "")) {
    return "A valid PKCE code challenge is required.";
  }
  const scope = params.get("scope");
  if (scope && !scope.split(/\s+/).includes("mcp")) return "The mcp scope is required.";
  return null;
}

export function createAuthorizationCode(
  payload: Omit<AuthorizationCodePayload, "exp">,
  env: OAuthEnv = process.env,
  now = Date.now(),
): string {
  assertHostedMcpConfigured(env);
  if (payload.clientId !== DEFAULT_CLIENT_ID) throw new Error("Unknown OAuth client");
  if (!isAllowedOAuthRedirectUri(payload.redirectUri, env)) throw new Error("Unapproved redirect URI");
  if (
    payload.codeChallengeMethod !== "S256" ||
    !S256_CHALLENGE_PATTERN.test(payload.codeChallenge)
  ) throw new Error("S256 PKCE is required");
  if (!isIssuedAccessToken(payload.token, env)) throw new Error("Unrecognized access token");

  const fullPayload: AuthorizationCodePayload = { ...payload, exp: now + CODE_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authorizationCodeKey(oauthSecrets(env)[0]), iv);
  cipher.setAAD(Buffer.from(AUTH_CODE_VERSION));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(fullPayload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    AUTH_CODE_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function verifyAuthorizationCode(
  code: string,
  exchange: AuthorizationCodeExchange,
  env: OAuthEnv = process.env,
  now = Date.now(),
): AuthorizationCodePayload | null {
  try {
    assertHostedMcpConfigured(env);
    const payload = decryptAuthorizationCode(code, env);
    if (!payload || payload.exp <= now) return null;
    if (payload.redirectUri !== exchange.redirectUri || payload.clientId !== exchange.clientId) return null;
    if (!isAllowedOAuthRedirectUri(payload.redirectUri, env)) return null;
    if (
      payload.codeChallengeMethod !== "S256" ||
      !PKCE_VERIFIER_PATTERN.test(exchange.verifier)
    ) return null;
    const actual = createHash("sha256").update(exchange.verifier).digest("base64url");
    if (!safeEqual(actual, payload.codeChallenge)) return null;
    if (!isIssuedAccessToken(payload.token, env)) return null;
    if (!consumeOnce(redeemedAuthorizationCodes, code, payload.exp, now)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createRefreshToken(
  accessToken: string,
  env: OAuthEnv = process.env,
  now = Date.now(),
): string {
  assertHostedMcpConfigured(env);
  const nonce = randomBytes(18).toString("base64url");
  const payload = JSON.stringify({
    token: accessToken,
    exp: now + REFRESH_TOKEN_TTL_MS,
    nonce,
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", refreshTokenKey(oauthSecrets(env)[0]), iv);
  cipher.setAAD(Buffer.from(REFRESH_TOKEN_VERSION));
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return [
    REFRESH_TOKEN_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function verifyRefreshToken(
  refreshToken: string,
  env: OAuthEnv = process.env,
  now = Date.now(),
): string | null {
  try {
    assertHostedMcpConfigured(env);
    if (isCredentialRevoked(refreshToken, env)) return null;
    const payload = parseRefreshToken(refreshToken, env);
    if (!payload) return null;
    if (
      typeof payload.token !== "string" ||
      !payload.token ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) return null;
    if (!(isIssuedAccessToken(payload.token, env) || isAuthenticSignedAccessToken(payload.token, env))) {
      return null;
    }
    if (!consumeOnce(redeemedRefreshTokens, refreshToken, payload.exp, now)) return null;
    return payload.token;
  } catch {
    return null;
  }
}

export function authorizationPage(
  params: URLSearchParams,
  error?: string,
  showForm = !error && params.has("redirect_uri"),
): string {
  const hidden = ["response_type", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method"]
    .map((key) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(params.get(key) || "")}">`)
    .join("\n");
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : "";
  const formHtml = !showForm
    ? ""
    : `<form method="post" action="${OAUTH_AUTHORIZE_PATH}">
${hidden}
<label for="access_token">Access token</label>
<input id="access_token" name="access_token" type="password" autocomplete="off" required placeholder="eas_live_…">
<button type="submit">Authorize Claude</button>
</form>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect Education Agent Skills</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf7f0;color:#1f1b16;margin:0;display:grid;min-height:100vh;place-items:center}.card{background:white;max-width:520px;padding:28px;border-radius:18px;box-shadow:0 12px 40px #0002}label{display:block;font-weight:700;margin:20px 0 8px}input[type=password],input[type=text]{box-sizing:border-box;width:100%;font-size:16px;padding:12px;border:1px solid #cfc7ba;border-radius:10px}button{margin-top:18px;background:#191510;color:white;border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer}.hint{color:#665f55;line-height:1.45}.request-access{margin:16px 0 4px;padding:12px 14px;background:#f6efe3;border:1px solid #e5dac8;border-radius:12px;color:#4f473b;line-height:1.45}.request-access a{color:#191510;font-weight:700}.error{background:#ffe8e2;color:#8d1c0c;padding:10px 12px;border-radius:10px}</style>
</head>
<body><main class="card">
<h1>Connect Education Agent Skills</h1>
<p class="hint">Paste the access token from your email to approve this connector.</p>
<p class="request-access">Don’t have an access token yet? <a href="${HOSTED_MCP_ACCESS_SIGNUP_URL}" target="_blank" rel="noopener noreferrer">Request one using the hosted MCP access form</a>.</p>
${errorHtml}
${formHtml}
</main></body></html>`;
}

export function resetOAuthReplayCachesForTests(): void {
  redeemedAuthorizationCodes.clear();
  redeemedRefreshTokens.clear();
}

function decryptAuthorizationCode(code: string, env: OAuthEnv): AuthorizationCodePayload | null {
  const [version, encodedIv, encodedCiphertext, encodedTag, ...extra] = code.split(".");
  if (
    version !== AUTH_CODE_VERSION ||
    !encodedIv ||
    !encodedCiphertext ||
    !encodedTag ||
    extra.length > 0
  ) return null;

  for (const secret of oauthSecrets(env)) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        authorizationCodeKey(secret),
        Buffer.from(encodedIv, "base64url"),
      );
      decipher.setAAD(Buffer.from(AUTH_CODE_VERSION));
      decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      const payload = JSON.parse(plaintext) as Partial<AuthorizationCodePayload>;
      if (
        typeof payload.token !== "string" ||
        typeof payload.redirectUri !== "string" ||
        typeof payload.clientId !== "string" ||
        typeof payload.codeChallenge !== "string" ||
        payload.codeChallengeMethod !== "S256" ||
        typeof payload.exp !== "number" ||
        !Number.isFinite(payload.exp)
      ) return null;
      return payload as AuthorizationCodePayload;
    } catch {
      // Try the previous token-signing key during OAuth-key rollout.
    }
  }
  return null;
}

function oauthSecrets(env: OAuthEnv): string[] {
  assertHostedMcpConfigured(env);
  return [...new Set([
    env.MCP_OAUTH_SIGNING_SECRET?.trim(),
    env.MCP_TOKEN_SIGNING_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret)))];
}

function authorizationCodeKey(secret: string): Buffer {
  return createHash("sha256")
    .update("education-agent-skills:oauth-code:")
    .update(secret)
    .digest();
}

function refreshTokenKey(secret: string): Buffer {
  return createHash("sha256")
    .update("education-agent-skills:oauth-refresh:")
    .update(secret)
    .digest();
}

function parseRefreshToken(
  refreshToken: string,
  env: OAuthEnv,
): { token: string; exp: number } | null {
  if (refreshToken.startsWith(`${REFRESH_TOKEN_VERSION}.`)) {
    const [version, encodedIv, encodedCiphertext, encodedTag, ...extra] = refreshToken.split(".");
    if (!encodedIv || !encodedCiphertext || !encodedTag || extra.length > 0) return null;
    for (const secret of oauthSecrets(env)) {
      try {
        const decipher = createDecipheriv(
          "aes-256-gcm",
          refreshTokenKey(secret),
          Buffer.from(encodedIv, "base64url"),
        );
        decipher.setAAD(Buffer.from(version));
        decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
        const plaintext = Buffer.concat([
          decipher.update(Buffer.from(encodedCiphertext, "base64url")),
          decipher.final(),
        ]).toString("utf8");
        return parsedRefreshTokenPayload(plaintext);
      } catch {
        // Try the previous token-signing key during OAuth-key rollout.
      }
    }
    return null;
  }

  // Compatibility with the deployed signed/base64 refresh format.
  const dot = refreshToken.lastIndexOf(".");
  if (dot < 1) return null;
  const body = refreshToken.slice(0, dot);
  const signature = refreshToken.slice(dot + 1);
  if (!oauthSecrets(env).some((secret) => safeEqual(signature, sign(body, secret)))) return null;
  return parsedRefreshTokenPayload(Buffer.from(body, "base64url").toString("utf8"));
}

function parsedRefreshTokenPayload(raw: string): { token: string; exp: number } | null {
  try {
    const payload = JSON.parse(raw) as unknown;
    if (
      !isRecord(payload) ||
      typeof payload.token !== "string" ||
      !payload.token ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) return null;
    return { token: payload.token, exp: payload.exp };
  } catch {
    return null;
  }
}

function allowedRedirectUris(env: OAuthEnv): Set<string> {
  return new Set([
    DEFAULT_REDIRECT_URI,
    ...splitList(env.MCP_OAUTH_REDIRECT_URIS)
      .map((uri) => normalizeRedirectUri(uri, env))
      .filter((uri): uri is string => Boolean(uri)),
  ]);
}

function normalizeRedirectUri(value: string, env: OAuthEnv): string | null {
  try {
    const url = new URL(value);
    const isLoopbackHttp = isDevelopmentLoopback(url, env);
    if (url.protocol !== "https:" && !isLoopbackHttp) return null;
    if (url.hash || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value: string, env: OAuthEnv): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !isDevelopmentLoopback(url, env)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isDevelopmentLoopback(url: URL, env: OAuthEnv): boolean {
  return (
    (env.NODE_ENV === "development" || env.NODE_ENV === "test") &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
  );
}

function isStrongSecret(secret?: string): secret is string {
  return Boolean(secret && Buffer.byteLength(secret, "utf8") >= MIN_SECRET_BYTES);
}

function splitList(raw?: string): string[] {
  return (raw ?? "")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function consumeOnce(
  cache: Map<string, number>,
  credential: string,
  expiresAt: number,
  now: number,
): boolean {
  for (const [fingerprint, expiry] of cache) {
    if (expiry <= now) cache.delete(fingerprint);
  }
  const fingerprint = createHash("sha256").update(credential).digest("base64url");
  if (cache.has(fingerprint)) return false;
  // Preserve still-live replay records. If the bounded cache is exhausted,
  // fail closed until an entry expires instead of evicting a credential that
  // could then be replayed.
  if (cache.size >= MAX_REPLAY_ENTRIES) return false;
  cache.set(fingerprint, expiresAt);
  return true;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] || char);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
