# Education Skills MCP Server

MCP server exposing the [Education Agent Skills](https://github.com/GarethManning/education-agent-skills) library as callable tools and prompts. 165 evidence-based education skills across 20 domains, plus 4 discovery tools.

**Production URL:** `https://mcp-server-sigma-sooty.vercel.app/mcp`

This hosted endpoint is a convenience for clients that specifically need remote MCP discovery. It is not required for local Claude Code, Codex, or manual use. For sustainable free use, prefer installing the skills locally from GitHub where possible. See [Hosted MCP access](../docs/HOSTED_MCP_ACCESS.md) and [Codex setup](../docs/CODEX.md).

## Architecture

Skills are registered **twice** — as both MCP tools and MCP prompts:

- **Tools** (169 total: 165 skills + 4 meta) — work in Claude.ai and any MCP client. The calling Claude model receives the assembled skill prompt via instruction framing and generates the output.
- **Prompts** (165) — ready for Claude Desktop and future clients that surface MCP prompts in their UI. The prompt is injected into the conversation as a user message.

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
| `MCP_TOKEN_SIGNING_SECRET` | Required to issue and validate signed hosted-access tokens. Use a long random secret. Newly issued tokens expire after 30 days. |
| `MCP_OAUTH_SIGNING_SECRET` | Optional separate secret for OAuth authorization and refresh tokens. Defaults to `MCP_TOKEN_SIGNING_SECRET`. |
| `MCP_PUBLIC_BASE_URL` | Canonical public origin used in OAuth metadata. Set this for non-production or custom-domain deployments. |
| `MCP_OAUTH_REDIRECT_URIS` | Optional comma- or newline-separated list of additional exact OAuth callback URLs. The Claude callback is always allowed. |
| `MCP_ACCESS_TOKEN_HASHES` | Optional comma- or newline-separated SHA-256 hashes for manually issued compatibility tokens. |
| `RESEND_API_KEY` | Required by `/api/request-access` to deliver access-token emails. |
| `MCP_FROM_EMAIL` | Optional verified sender address for access-token emails. |

Hosted OAuth requires S256 PKCE. Bearer tokens are accepted only in the `Authorization` header; query-string tokens are rejected to keep credentials out of URLs and logs.

## How skill tools work

1. Teacher (or Claude) calls a skill tool with required parameters
2. Server loads the skill's evidence-based prompt template
3. `{{placeholder}}` tokens are replaced with provided values; unprovided optional params become `[not provided]`
4. The assembled prompt is wrapped in instruction framing and returned as the tool result
5. The calling Claude model follows the instructions and generates the structured output

## Licence

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see [LICENSE](LICENSE).
