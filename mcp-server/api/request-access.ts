import type { IncomingMessage, ServerResponse } from "node:http";
import { createHmac } from "node:crypto";
import { createSignedAccessToken } from "../src/http-auth.js";
import { publicBaseUrl } from "../src/oauth.js";
import {
  isInvalidRequestBody,
  isRequestBodyTooLarge,
  readJsonBody,
  SMALL_REQUEST_BODY_LIMIT_BYTES,
  writeRequestBodyTooLarge,
  type RequestWithBody,
} from "../src/request-body.js";

/**
 * Self-hosted MCP access request endpoint.
 *
 * GET  — renders a simple HTML form (no Google Forms, no OAuth).
 * POST — validates the email, generates an HMAC-signed access token,
 *        sends it via Resend, and returns JSON.
 *
 * Env vars:
 *   MCP_TOKEN_SIGNING_SECRET  — required random secret shared with http-auth.ts
 *   RESEND_API_KEY            — Resend API key (never expires, no OAuth)
 *   MCP_FROM_EMAIL            — optional, defaults to onboarding@resend.dev
 */

const PUBLIC_DOCS_URL = "https://github.com/GarethManning/education-agent-skills";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

// --- Email via Resend ---

function clientInstruction(tool: string): string {
  const t = (tool || "").toLowerCase();
  if (t.includes("claude")) {
    return (
      "1. Add the MCP server URL in Claude.\n" +
      "2. Press Connect.\n" +
      "3. When the authorization screen opens, paste the access token from this email."
    );
  }
  return (
    "1. Add the MCP server URL in your MCP client.\n" +
    "2. When your client asks for authentication, paste the access token from this email."
  );
}

function buildEmailBody(name: string, tool: string, token: string, mcpUrl: string): string {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return `${greeting}

Thanks for requesting hosted MCP access for Education Agent Skills.

MCP server URL:
${mcpUrl}

Access token:
${token}

Setup for ${tool || "Claude"}:
${clientInstruction(tool)}

That's it. Please don't put the token in the URL; Claude will ask for it on the authorization screen.

Free local options are also available here:
${PUBLIC_DOCS_URL}

If it doesn't work, just reply to this email with a screenshot of the error.

— Gareth's Agent
`;
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  body: string,
  env: Record<string, string | undefined>,
): Promise<{ success: boolean }> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false };
  }

  const fromEmail = env.MCP_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Gareth's Agent <${fromEmail}>`,
        to: [to],
        subject,
        text: body,
        reply_to: "gareth.ai.agent@gmail.com",
      }),
    });

    if (!res.ok) {
      return { success: false };
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

// --- Bounded in-memory abuse controls (per-instance, best-effort) ---

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_ENTRIES = 10_000;

function checkAccessRateLimit(
  req: IncomingMessage,
  email: string,
  env: Record<string, string | undefined>,
): boolean {
  const now = Date.now();
  const secret = env.MCP_TOKEN_SIGNING_SECRET!.trim();
  const ip = clientIp(req);
  const keys: Array<[string, number]> = [
    [fingerprint("global", secret), 100],
    [fingerprint(`ip:${ip}`, secret), 5],
    [fingerprint(`email:${email}`, secret), 3],
  ];

  for (const [key, maximum] of keys) {
    const entry = rateLimitMap.get(key);
    if (entry && now - entry.windowStart <= RATE_LIMIT_WINDOW_MS && entry.count >= maximum) {
      return false;
    }
  }
  for (const [key] of keys) {
    const entry = rateLimitMap.get(key);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.set(key, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
    }
  }
  if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS && !keys.some(([protectedKey]) => protectedKey === key)) {
        rateLimitMap.delete(key);
      }
      if (rateLimitMap.size <= RATE_LIMIT_MAX_ENTRIES) break;
    }
    for (const key of rateLimitMap.keys()) {
      if (rateLimitMap.size <= RATE_LIMIT_MAX_ENTRIES) break;
      if (!keys.some(([protectedKey]) => protectedKey === key)) rateLimitMap.delete(key);
    }
  }
  return true;
}

function clientIp(req: IncomingMessage): string {
  const realIp = headerValue(req.headers["x-real-ip"]);
  if (realIp) return realIp.trim();
  const forwarded = headerValue(req.headers["x-forwarded-for"]);
  if (forwarded) return forwarded.split(",").at(-1)?.trim() || "unknown";
  return req.socket?.remoteAddress || "unknown";
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function fingerprint(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function resetAccessRateLimitsForTests(): void {
  rateLimitMap.clear();
}

// --- Email validation ---

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// --- HTML form page ---

function renderFormPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Request Education Agent Skills MCP Access</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf7f0;color:#1f1b16;margin:0;display:grid;min-height:100vh;place-items:center;padding:20px}
.card{background:white;max-width:520px;width:100%;padding:28px;border-radius:18px;box-shadow:0 12px 40px #0002}
h1{margin:0 0 8px;font-size:24px}
.hint{color:#665f55;line-height:1.5;margin:0 0 20px}
label{display:block;font-weight:700;margin:16px 0 6px}
input,select,textarea{box-sizing:border-box;width:100%;font-size:16px;padding:10px 12px;border:1px solid #cfc7ba;border-radius:10px;font-family:inherit}
textarea{resize:vertical;min-height:60px}
button{margin-top:20px;background:#191510;color:white;border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer;width:100%;font-size:16px}
button:disabled{opacity:0.5;cursor:default}
.note{margin-top:16px;color:#665f55;font-size:14px;line-height:1.45}
.note a{color:#191510;font-weight:600}
.success{background:#e8f5e9;color:#1b5e20;padding:14px;border-radius:10px;margin-top:16px;display:none}
.error{background:#ffe8e2;color:#8d1c0c;padding:14px;border-radius:10px;margin-top:16px;display:none}
.optional{color:#665f55;font-weight:400;font-size:14px}
</style>
</head>
<body>
<main class="card">
<h1>Request MCP Access</h1>
<p class="hint">Get an access token for the Education Agent Skills hosted MCP server. Works with Claude.ai, Claude Desktop, and any MCP-compatible client.</p>
<form id="accessForm">
<label for="email">Email address <span class="optional">(required)</span></label>
<input id="email" name="email" type="email" required placeholder="you@example.com">

<label for="name">Your name <span class="optional">(optional)</span></label>
<input id="name" name="name" type="text" placeholder="Jane Smith">

<label for="tool">Which tool/client will you use? <span class="optional">(optional)</span></label>
<select id="tool" name="tool">
<option value="Claude.ai">Claude.ai</option>
<option value="Claude Desktop">Claude Desktop</option>
<option value="Claude Code">Claude Code</option>
<option value="OpenAI Codex">OpenAI Codex</option>
<option value="Custom MCP client">Custom MCP client</option>
<option value="Other / not sure">Other / not sure</option>
</select>

<label for="use_case">What are you trying to do? <span class="optional">(optional — please don't include student data)</span></label>
<textarea id="use_case" name="use_case" placeholder="One or two sentences about your use case."></textarea>

<button type="submit" id="submitBtn">Request access token</button>
</form>
<div class="success" id="successMsg"></div>
<div class="error" id="errorMsg"></div>
<p class="note">Prefer a free local option? Install the skills directly from <a href="${PUBLIC_DOCS_URL}" target="_blank" rel="noopener">GitHub</a> — no hosted server required.</p>
</main>
<script>
const form=document.getElementById('accessForm');
const btn=document.getElementById('submitBtn');
const successMsg=document.getElementById('successMsg');
const errorMsg=document.getElementById('errorMsg');
form.addEventListener('submit',async(e)=>{
e.preventDefault();
btn.disabled=true;
btn.textContent='Sending...';
successMsg.style.display='none';
errorMsg.style.display='none';
const data={email:email.value.trim(),name:name.value.trim(),tool:tool.value,use_case:use_case.value.trim()};
try{
const res=await fetch('/api/request-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const json=await res.json();
if(res.ok&&json.success){
form.style.display='none';
successMsg.textContent='Check your email. If delivery succeeds, it will contain your access token and setup instructions.';
successMsg.style.display='block';
}else{
errorMsg.textContent=json.error||'Something went wrong. Please try again or email gareth.ai.agent@gmail.com.';
errorMsg.style.display='block';
}
}catch(err){
errorMsg.textContent='Network error. Please try again.';
errorMsg.style.display='block';
}
btn.disabled=false;
btn.textContent='Request access token';
});
</script>
</body>
</html>`;
}

// --- Main handler ---

export default async function handler(
  req: RequestWithBody,
  res: ServerResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let baseUrl: string;
  try {
    baseUrl = publicBaseUrl(undefined, process.env);
    if (!process.env.RESEND_API_KEY?.trim()) throw new Error("Email provider is not configured");
  } catch {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, error: "Hosted access is temporarily unavailable. Please try again later." }));
    return;
  }

  // GET — show the form
  if (req.method === "GET") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.writeHead(200);
    res.end(renderFormPage());
    return;
  }

  if (!isTrustedRequestOrigin(req, baseUrl)) {
    res.writeHead(403, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, error: "Request origin is not allowed" }));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "GET, POST, OPTIONS" });
    res.end("Method not allowed");
    return;
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, SMALL_REQUEST_BODY_LIMIT_BYTES);
  } catch (error) {
    if (isRequestBodyTooLarge(error)) {
      writeRequestBodyTooLarge(res, error);
      return;
    }
    if (isInvalidRequestBody(error)) {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ success: false, error: "Invalid JSON body" }));
      return;
    }
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, error: "Hosted access is temporarily unavailable. Please try again later." }));
    return;
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const tool = String(body.tool || "Claude").trim();
  const useCase = String(body.use_case || "").trim();

  if (!email) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Email is required" }));
    return;
  }

  if (!isValidEmail(email)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Please enter a valid email address" }));
    return;
  }

  if (name.length > 120 || tool.length > 80 || useCase.length > 2_000) {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: "One or more fields are too long" }));
    return;
  }

  if (!checkAccessRateLimit(req, email, process.env)) {
    res.writeHead(429, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(RATE_LIMIT_WINDOW_MS / 1000),
    });
    res.end(JSON.stringify({ success: false, error: "Too many requests. Please try again later." }));
    return;
  }

  // Generate token
  let token: string;
  try {
    token = createSignedAccessToken(process.env);
  } catch {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, error: "Hosted access is temporarily unavailable. Please try again later." }));
    return;
  }

  // Send email
  const subject = "Your Education Agent Skills hosted MCP access";
  const emailBody = buildEmailBody(name, tool, token, `${baseUrl}/mcp`);
  const result = await sendEmailViaResend(email, subject, emailBody, process.env);

  if (!result.success) {
    console.error("[request-access] Access email delivery failed");
    res.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, error: "Unable to send the access email. Please try again later." }));
    return;
  }

  console.log("[request-access] Access email accepted by provider");
  res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify({ success: true }));
}

function isTrustedRequestOrigin(req: IncomingMessage, baseUrl: string): boolean {
  const fetchSite = headerValue(req.headers["sec-fetch-site"]);
  if (fetchSite === "cross-site") return false;
  const origin = headerValue(req.headers.origin);
  if (!origin) return true;
  try {
    return new URL(origin).origin === baseUrl;
  } catch {
    return false;
  }
}
