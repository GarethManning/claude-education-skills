# Hosted MCP access

The Education Agent Skills Library is free and open source. The hosted MCP server is a convenience endpoint for remote clients that cannot install the skills locally.

If you can use the skills locally, please do that first. Local use costs nothing to host, keeps the project sustainable, and avoids routing your work through the public MCP server.

## Why hosted access is controlled

The public hosted MCP endpoint has created real infrastructure costs because anonymous remote clients can open long-lived connections. Those connections are useful for some MCP workflows, but they are not free to run at public scale.

The library stays free while the hosted service uses a more sustainable access model:

- Local plugin use remains free.
- Manual copy-paste use remains free.
- The GitHub repository remains open.
- Hosted MCP is access-controlled with unique tokens and may be rate-limited so the service stays sustainable.

## Free alternatives to hosted MCP

### Claude

Use the Claude plugin route where available:

```text
https://github.com/GarethManning/education-agent-skills
```

Or install with Claude Code:

```bash
claude plugin install https://github.com/GarethManning/education-agent-skills
```

### OpenAI Codex

Use the local Codex plugin or copy individual skills locally. See [CODEX.md](CODEX.md).

### Any AI tool

Open any `SKILL.md` file under `skills/`, copy the instructions, and paste them into Claude, ChatGPT, Codex, Gemini, or another assistant with your teaching context.

### Local MCP

Clone the repository and run the MCP server locally if your client supports local MCP configuration. See [mcp-server/README.md](../mcp-server/README.md).

## Hosted MCP access signup

Hosted MCP is mainly for people who cannot use local plugins or local skill files, or who are building a workflow that specifically depends on remote MCP discovery.

Request hosted MCP access here:

```text
https://mcp-server-sigma-sooty.vercel.app/request-access
```

The request page is hosted alongside the MCP service. Email is required so the service can deliver a unique access token; name, client, and use-case context are optional. Do not include student data or confidential school information.

After a successful request, the service:

1. Generates a unique signed access token.
2. Sends the MCP URL, token, and client-specific setup instructions by email.

The hosted MCP endpoint rejects anonymous requests, and access requests are rate-limited. Free local, plugin, and manual options remain available.

## Connect after receiving a token

### Claude.ai

1. Add `https://mcp-server-sigma-sooty.vercel.app/mcp` under **Integrations > MCP Servers**.
2. Select **Connect**.
3. Paste the emailed token into the authorization page.

### Clients that support bearer headers

Send the token in the HTTP `Authorization` header:

```text
Authorization: Bearer <access token>
```

Do not put access tokens in query strings, shared configuration files, screenshots, or issue reports. If a token is exposed, request a replacement and stop using the exposed token.

## Troubleshooting

- If the message does not arrive, check spam or junk folders before retrying later.
- A `401` response from `/mcp` means the token is missing or is not being accepted.
- For local setup questions, see [the MCP server README](../mcp-server/README.md).

Never include an access token when opening a public issue. Describe the status code and client instead.
