import type { IncomingMessage, ServerResponse } from "node:http";
import { createSignedAccessToken } from "../src/http-auth.js";

/**
 * Self-hosted MCP access request endpoint.
 *
 * GET  — renders a simple HTML form (no Google Forms, no OAuth).
 * POST — validates the email, generates an HMAC-signed access token,
 *        sends it via Resend, and returns JSON.
 *
 * Env vars:
 *   MCP_TOKEN_SIGNING_SECRET  — already set on Vercel (shared with http-auth.ts)
 *   RESEND_API_KEY            — Resend API key (never expires, no OAuth)
 *   MCP_FROM_EMAIL            — optional, defaults to onboarding@resend.dev
 */

const MCP_URL = "https://mcp-server-sigma-sooty.vercel.app/mcp";
const PUBLIC_DOCS_URL = "https://github.com/GarethManning/education-agent-skills";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
const TOKEN_PREFIX_LENGTH = 18;

function tokenPrefix(token: string): string {
  return token.slice(0, TOKEN_PREFIX_LENGTH);
}

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

function buildEmailBody(name: string, tool: string, token: string): string {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return `${greeting}

Thanks for requesting hosted MCP access for Education Agent Skills.

MCP server URL:
${MCP_URL}

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
): Promise<{ success: boolean; id?: string }> {
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

    const data = await res.json() as { id?: string };
    return { success: true, id: data.id };
  } catch {
    return { success: false };
  }
}

// --- Simple in-memory rate limiting (per-instance, best-effort) ---

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 requests per hour per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
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
successMsg.innerHTML='<strong>Check your email!</strong> An access token and setup instructions have been sent to <strong>'+data.email+'</strong>. Look for an email from "Gareth\\'s Agent".';
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
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET — show the form
  if (req.method === "GET") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.writeHead(200);
    res.end(renderFormPage());
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "GET, POST, OPTIONS" });
    res.end("Method not allowed");
    return;
  }

  // Rate limit
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Too many requests. Please try again later." }));
    return;
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    } else if (req.body && typeof req.body === "object") {
      body = req.body as Record<string, unknown>;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Invalid JSON body" }));
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

  // Generate token
  let token: string;
  try {
    token = createSignedAccessToken(process.env);
  } catch {
    console.error("[request-access] Token generation is unavailable");
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({
      success: false,
      error: "Hosted access is temporarily unavailable. Please try again later.",
    }));
    return;
  }

  // Send email
  const subject = "Your Education Agent Skills hosted MCP access";
  const emailBody = buildEmailBody(name, tool, token);
  const result = await sendEmailViaResend(email, subject, emailBody, process.env);

  if (!result.success) {
    console.error("[request-access] Email delivery failed");
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({
      success: false,
      error: "Unable to send the access email. Please try again later.",
    }));
    return;
  }

  console.log(`[request-access] Token issued (prefix: ${tokenPrefix(token)}, resend_id: ${result.id})`);

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    success: true,
    token_prefix: tokenPrefix(token),
  }));
}
