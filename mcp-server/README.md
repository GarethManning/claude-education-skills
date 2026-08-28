# Education Skills MCP Server

MCP server exposing the [Education Agent Skills](https://github.com/GarethManning/education-agent-skills) library as callable tools and prompts. 165 evidence-based education skills across 20 domains, plus 4 discovery tools.

**Production URL:** `https://mcp-server-sigma-sooty.vercel.app/mcp`

This hosted endpoint is a convenience for clients that specifically need remote MCP discovery. It is not required for local Claude Code, Codex, or manual use. For sustainable free use, prefer installing the skills locally from GitHub where possible. See [Hosted MCP access](../docs/HOSTED_MCP_ACCESS.md) and [Codex setup](../docs/CODEX.md).

## Architecture

All skills are registered as prompts. Skills that permit model invocation are also registered as tools:

- **Tools** (157 total: 153 skills + 4 meta) — work in Claude.ai and any MCP client. The 12 skills marked `disable-model-invocation: true` are deliberately not tools.
- **Prompts** (165) — all skills remain discoverable and available for explicit prompt use, including the 12 that are not model-invoked tools.

### Meta-tools (always available as tools)

| Tool | Purpose |
|------|---------|
| `list_skills` | Browse all skills grouped by domain |
| `get_skill_details` | Full metadata for a specific skill (evidence sources, schemas, chaining info) |
| `find_skills` | Search by tag, domain, evidence strength, or free text |
| `suggest_skills` | Describe a teaching problem in plain English, get 3-5 relevant skill recommendations |

## Connect to Claude.ai

Add this MCP server in your Claude.ai settings under **Integrations > MCP Servers** if you specifically need hosted MCP access:

```
https://mcp-server-sigma-sooty.vercel.app/mcp
```

Transport: Streamable HTTP (stateless, JSON response mode).

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "education-skills": {
      "type": "streamable-http",
      "url": "https://mcp-server-sigma-sooty.vercel.app/mcp"
    }
  }
}
```

## Run locally (stdio)

```bash
cd mcp-server
npm install
npm run build
npm start
```

For Claude Desktop local config:

```json
{
  "mcpServers": {
    "education-skills": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm run dev          # Run with tsx (no build step)
npm run build        # Compile TypeScript
npm test             # Run Playwright test suite
npm run bundle-skills # Re-generate src/skills.json for Vercel deployment
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `SKILLS_FILTER` | Comma-separated domain names to limit which domains are loaded. Omit for all 20 domains. |
| `MCP_PUBLIC_BASE_URL` | Required canonical HTTPS origin for hosted endpoints, for example `https://mcp-server-sigma-sooty.vercel.app`. Request `Host` headers are never trusted. |
| `MCP_TOKEN_SIGNING_SECRET` | Required random secret of at least 32 bytes for newly issued, 30-day access tokens. Existing signed tokens remain compatible. |
| `MCP_OAUTH_SIGNING_SECRET` | Optional separate random OAuth key of at least 32 bytes. New OAuth credentials use it; verification also accepts the token-signing key so existing refresh credentials continue to work. |
| `MCP_OAUTH_REDIRECT_URIS` | Optional comma/newline-separated exact redirect allowlist in addition to the Claude callback. |
| `MCP_REVOKED_TOKEN_HASHES` | Optional comma/newline-separated SHA-256 hashes of individual access or refresh credentials to revoke without rotating a global secret. |
| `MCP_ACCESS_TOKEN_HASHES` / `MCP_ACCESS_TOKENS` | Compatibility inputs for existing manually issued hashed/plain tokens. New issuance uses expiring signed tokens. |
| `RESEND_API_KEY` | Required for the hosted access-email endpoint. Provider failures return an error and do not expose provider details, requester data, or credential fragments. |
| `MCP_FROM_EMAIL` | Optional verified sender address for access email. |

Hosted OAuth requires S256 PKCE and an approved callback. Authorization codes are encrypted, authenticated, bound to the client and redirect, expire after 10 minutes, and are rejected on replay within the serving instance. New refresh credentials are encrypted, expire after 30 days, and rotate on use. Bearer credentials are accepted only through the `Authorization` header.

The implementation has no paid or durable shared store. Rate limits and single-use replay caches are therefore strongest-effort per serverless instance; a replay routed to a separate live instance cannot be ruled out. The short lifetimes, encryption, PKCE binding, exact redirects, credential rotation, and individual revocation list reduce this residual without pretending it is globally stateful.

## How skill tools work

1. Teacher (or Claude) calls a skill tool with required parameters
2. Server loads the skill's evidence-based prompt template
3. `{{placeholder}}` tokens are replaced with provided values; unprovided optional params become `[not provided]`
4. The assembled prompt is wrapped in instruction framing and returned as the tool result
5. The calling Claude model follows the instructions and generates the structured output

## Licence

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see [LICENSE](LICENSE).
