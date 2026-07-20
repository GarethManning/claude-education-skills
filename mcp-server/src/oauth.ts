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
  getAuthorizedTokenPrefix,
  isAuthenticSignedAccessToken,
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
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const AUTH_CODE_VERSION = "eas_code_v1";
const S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
export const DEFAULT_CLIENT_ID = "claude-ai-custom-connector";
export const DEFAULT_REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

export type AuthorizationCodePayload = {
  token: string;
  redirectUri: string;
  clientId: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  exp: number;
};

export type AuthorizationCodeExchange = {
  verifier: string;
  redirectUri: string;
  clientId: string;
};

export function publicBaseUrl(
  _req?: { headers?: Record<string, string | string[] | undefined> },
  env: OAuthEnv = process.env,
): string {
  const configured = env.MCP_PUBLIC_BASE_URL?.trim();
  const normalizedConfigured = configured ? normalizeBaseUrl(configured) : null;
  if (normalizedConfigured) return normalizedConfigured;

  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const normalizedVercelHost = vercelHost
    ? normalizeBaseUrl(`https://${vercelHost.replace(/^https?:\/\//, "")}`)
    : null;
  if (normalizedVercelHost) return normalizedVercelHost;

  return "https://mcp-server-sigma-sooty.vercel.app";
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
  const requestedRedirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((v): v is string => typeof v === "string") : [];
  const approvedRedirectUris = requestedRedirectUris
    .map(normalizeRedirectUri)
    .filter((uri): uri is string => uri !== null && isAllowedOAuthRedirectUri(uri, env));
  return {
    client_id: DEFAULT_CLIENT_ID,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: approvedRedirectUris.length ? approvedRedirectUris : [DEFAULT_REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    client_name: typeof body.client_name === "string" ? body.client_name : "Claude custom connector",
    client_uri: baseUrl,
    scope: "mcp",
  };
}

export function isIssuedAccessToken(token: string, env: OAuthEnv = process.env): boolean {
  return Boolean(getAuthorizedTokenPrefix({ authorization: `Bearer ${token}`, env }));
}

export function isAllowedOAuthRedirectUri(
  redirectUri: string,
  env: OAuthEnv = process.env,
): boolean {
  const normalized = normalizeRedirectUri(redirectUri);
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
  return null;
}

export function createAuthorizationCode(payload: Omit<AuthorizationCodePayload, "exp">, env: OAuthEnv = process.env): string {
  if (payload.clientId !== DEFAULT_CLIENT_ID) throw new Error("Unknown OAuth client");
  if (!isAllowedOAuthRedirectUri(payload.redirectUri, env)) throw new Error("Unapproved redirect URI");
  if (
    payload.codeChallengeMethod !== "S256" ||
    !payload.codeChallenge ||
    !S256_CHALLENGE_PATTERN.test(payload.codeChallenge)
  ) {
    throw new Error("S256 PKCE is required");
  }
  if (!isIssuedAccessToken(payload.token, env)) throw new Error("Unrecognized access token");

  const fullPayload: AuthorizationCodePayload = { ...payload, exp: Date.now() + CODE_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authorizationCodeKey(env), iv);
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
): AuthorizationCodePayload | null {
  try {
    const [version, encodedIv, encodedCiphertext, encodedTag, ...extra] = code.split(".");
    if (
      version !== AUTH_CODE_VERSION ||
      !encodedIv ||
      !encodedCiphertext ||
      !encodedTag ||
      extra.length > 0
    ) return null;

    const decipher = createDecipheriv(
      "aes-256-gcm",
      authorizationCodeKey(env),
      Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAAD(Buffer.from(AUTH_CODE_VERSION));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as AuthorizationCodePayload;

    if (!payload.token || !payload.redirectUri || !payload.clientId || !payload.exp || payload.exp < Date.now()) return null;
    if (payload.redirectUri !== exchange.redirectUri || payload.clientId !== exchange.clientId) return null;
    if (!isAllowedOAuthRedirectUri(payload.redirectUri, env)) return null;
    if (
      payload.codeChallengeMethod !== "S256" ||
      !payload.codeChallenge ||
      !PKCE_VERIFIER_PATTERN.test(exchange.verifier)
    ) return null;
    const actual = createHash("sha256").update(exchange.verifier).digest("base64url");
    if (!safeEqual(actual, payload.codeChallenge)) return null;
    if (!isIssuedAccessToken(payload.token, env)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createRefreshToken(accessToken: string, env: OAuthEnv = process.env): string {
  const nonce = randomBytes(12).toString("base64url");
  const body = Buffer.from(JSON.stringify({ token: accessToken, exp: Date.now() + REFRESH_TOKEN_TTL_MS, nonce }), "utf8").toString("base64url");
  return `${body}.${sign(body, signingSecret(env))}`;
}

export function verifyRefreshToken(refreshToken: string, env: OAuthEnv = process.env): string | null {
  try {
    const dot = refreshToken.lastIndexOf(".");
    if (dot < 1) return null;
    const body = refreshToken.slice(0, dot);
    const signature = refreshToken.slice(dot + 1);
    if (!safeEqual(signature, sign(body, signingSecret(env)))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { token?: string; exp?: number };
    if (!payload.token || !payload.exp || payload.exp < Date.now()) return null;
    return isIssuedAccessToken(payload.token, env) || isAuthenticSignedAccessToken(payload.token, env)
      ? payload.token
      : null;
  } catch {
    return null;
  }
}

export function authorizationPage(params: URLSearchParams, error?: string): string {
  const hidden = ["response_type", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method"]
    .map((key) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(params.get(key) || "")}">`)
    .join("\n");
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : "";
  const formHtml = params.has("redirect_uri")
    ? `<form method="post" action="${OAUTH_AUTHORIZE_PATH}">
${hidden}
<label for="access_token">Access token</label>
<input id="access_token" name="access_token" type="password" autocomplete="off" required placeholder="eas_live_…">
<button type="submit">Authorize Claude</button>
</form>`
    : "";
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
<p class="hint">Paste the access token from your email. Claude will store it for this connector after you approve.</p>
<p class="request-access">Don’t have an access token yet? <a href="${HOSTED_MCP_ACCESS_SIGNUP_URL}" target="_blank" rel="noopener noreferrer">Request one using the hosted MCP access form</a>.</p>
${errorHtml}
${formHtml}
</main></body></html>`;
}

function signingSecret(env: OAuthEnv): string {
  const secret = env.MCP_OAUTH_SIGNING_SECRET?.trim() || env.MCP_TOKEN_SIGNING_SECRET?.trim();
  if (!secret) throw new Error("OAuth signing secret is not configured");
  return secret;
}

function authorizationCodeKey(env: OAuthEnv): Buffer {
  return createHash("sha256")
    .update("education-agent-skills:oauth-code:")
    .update(signingSecret(env))
    .digest();
}

function allowedRedirectUris(env: OAuthEnv): Set<string> {
  const configured = (env.MCP_OAUTH_REDIRECT_URIS ?? "")
    .split(/[\n,]/)
    .map((uri) => normalizeRedirectUri(uri.trim()))
    .filter((uri): uri is string => Boolean(uri));
  return new Set([DEFAULT_REDIRECT_URI, ...configured]);
}

function normalizeRedirectUri(value: string): string | null {
  try {
    const url = new URL(value);
    const isLoopbackHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !isLoopbackHttp) return null;
    if (url.hash || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))) {
      return null;
    }
    if (url.username || url.password) return null;
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
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
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] || char);
}
