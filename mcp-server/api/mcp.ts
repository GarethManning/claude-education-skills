import { createRequire } from "node:module";
import type { ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getUnauthorizedResponse, isAuthorizedBearerToken } from "../src/http-auth.js";
import { getHostedMcpConfigurationError, publicBaseUrl } from "../src/oauth.js";
import {
  isInvalidRequestBody,
  isRequestBodyTooLarge,
  readMcpBody,
  writeRequestBodyTooLarge,
  type RequestWithBody,
} from "../src/request-body.js";
import { createServer } from "../src/server.js";
import type { LoadedSkill } from "../src/types.js";

const require = createRequire(import.meta.url);
const skills = require("../src/skills.json") as unknown as LoadedSkill[];

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, mcp-session-id, mcp-protocol-version");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, WWW-Authenticate");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (getHostedMcpConfigurationError(process.env)) {
    writeJson(res, 503, { error: "hosted_mcp_unavailable" });
    return;
  }
  const baseUrl = publicBaseUrl(req);
  const isAuthorized = isAuthorizedBearerToken({ authorization: req.headers.authorization });
  if (!isAuthorized) {
    const unauthorized = getUnauthorizedResponse(
      `${baseUrl}/mcp`,
      req.method,
      `${baseUrl}/.well-known/oauth-protected-resource/mcp`,
    );
    for (const [key, value] of Object.entries(unauthorized.headers)) {
      res.setHeader(key, value);
    }
    res.writeHead(unauthorized.status);
    res.end(unauthorized.body);
    return;
  }

  let body: unknown;
  if (req.method === "POST") {
    try {
      body = await readMcpBody(req);
    } catch (error) {
      if (isRequestBodyTooLarge(error)) {
        writeRequestBodyTooLarge(res, error);
        return;
      }
      if (isInvalidRequestBody(error)) {
        res.writeHead(400, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null,
        }));
        return;
      }
      throw error;
    }
  }

  res.setHeader("X-MCP-Access", "token");
  const server = createServer(skills);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

function writeJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}
