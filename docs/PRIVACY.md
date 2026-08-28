# Privacy Policy — Education Agent Skills MCP Server

**Last updated: 28 August 2026**

## Overview

The Education Agent Skills MCP server is a read-only service that returns content and metadata from the open-source skill library. Hosted access is authenticated, and the optional access-request page uses an email provider to deliver a credential.

## Data handled by the application

For ordinary authenticated MCP calls, the application checks the bearer credential and processes the MCP request needed to return skill content. It does not create a user profile, write the teaching request to an application database, use cookies, or add analytics/tracking code.

The hosted access-request page accepts:

- email address (required);
- name (optional);
- MCP client/tool (optional); and
- short use case (optional).

The email address, optional name/tool, and generated access credential are sent to the configured email provider for delivery. The optional use-case text is length-checked in memory and discarded; it is not included in the email or written to storage. The application does not add any of these fields to a spreadsheet or application database. Application responses and logs do not include the requester email, provider response details, access token, or token prefix. Do not submit student data or confidential school information.

## Abuse controls and credentials

The access-request endpoint derives keyed one-way fingerprints for global, IP, and email rate-limit buckets. Those bounded counters exist only in the memory of the serving serverless instance and expire; plain email addresses are not used as rate-limit map keys. Because instances do not share memory, this is best-effort rather than globally durable limiting.

Bearer credentials are accepted only in the `Authorization` header. New access and refresh credentials expire, and individual credentials can be revoked using a configured SHA-256 hash. OAuth/access responses are marked `Cache-Control: no-store`.

## Third-party services

The server is hosted on Vercel. Vercel may process standard infrastructure data such as IP addresses, request timestamps, headers, and operational logs under [Vercel's Privacy Policy](https://vercel.com/legal/privacy-policy).

Access email is sent through Resend. Resend processes the supplied email address and message-delivery data under [Resend's privacy policy](https://resend.com/legal/privacy-policy). The application does not claim control over retention performed by these infrastructure providers.

## Open source

The source code is available at [github.com/GarethManning/education-agent-skills](https://github.com/GarethManning/education-agent-skills).

## Contact

For privacy questions, contact gareth.manning@gmail.com.
