# Hosted MCP access

The Education Agent Skills Library is free and open source. The hosted MCP server is a convenience endpoint for remote clients that cannot install the skills locally.

If local use works for your client, prefer it: local use costs nothing to host and does not route your teaching context through the public MCP service.

## Free alternatives

- Install the repository as a Claude, Codex, or Hermes plugin.
- Copy an individual `SKILL.md` prompt into any assistant.
- Clone the repository and run the MCP server locally over stdio.

See the [main setup guide](../README.md) and [local MCP instructions](../mcp-server/README.md).

## Request hosted access

Use the self-hosted request page:

```text
https://mcp-server-sigma-sooty.vercel.app/request-access
```

The page asks for:

- email address (required, to deliver the credential);
- name (optional);
- MCP client/tool (optional); and
- a short use case (optional — do not include student data or confidential school information).

If the email provider accepts the request, the page reports success and the email contains the MCP URL, an access token, and setup instructions. If configuration or email delivery fails, the page reports failure; it does not return provider details, the requester email, the token, or a token prefix.

## Authentication and credential behavior

- Hosted MCP rejects anonymous requests and accepts bearer credentials only through the `Authorization` header. Do not put tokens in URLs.
- Claude connections use an OAuth authorization-code flow with the existing Claude callback, exact redirect approval, and mandatory S256 PKCE.
- New access tokens expire after 30 days. Existing signed, hashed, and plain credentials remain accepted for compatibility unless individually revoked.
- New authorization codes are encrypted, authenticated, client/redirect-bound, and expire after 10 minutes.
- New refresh credentials are encrypted, expire after 30 days, and rotate when used. Refresh credentials from the previous signed format remain compatible.
- An individual access or refresh credential can be revoked by adding its SHA-256 hash to `MCP_REVOKED_TOKEN_HASHES`; this does not require global secret rotation or reconnecting everyone else.

The server deliberately has no paid or durable shared state. Same-instance authorization-code/refresh replay is rejected, and the access form applies bounded global/IP/email controls using keyed fingerprints rather than plain email keys. Serverless instances do not share those in-memory maps, so cross-instance single-use enforcement and globally durable rate limiting remain an explicit residual.

## Request limits and privacy

OAuth and access-request bodies are limited to 16 KiB. MCP request bodies are limited to 1 MiB. Oversized requests receive HTTP 413, and hosted auth/access responses use `Cache-Control: no-store`.

The email address, optional name/tool, and credential are sent to the email provider so delivery can be attempted. The optional use-case text is length-checked in memory and discarded. The application does not add a user database or access-request sheet. Vercel and the email provider may process standard infrastructure/delivery data; see the [privacy policy](PRIVACY.md).

## Service posture

Hosted access may be rate-limited or individually revoked to control abuse and infrastructure cost. Local plugin, local MCP, and manual use remain free and do not depend on hosted availability.
