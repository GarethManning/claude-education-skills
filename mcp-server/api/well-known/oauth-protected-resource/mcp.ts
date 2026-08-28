import type { IncomingMessage, ServerResponse } from "node:http";
import { protectedResourceMetadata, publicBaseUrl } from "../../../src/oauth.js";

export default function handler(req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }, res: ServerResponse) {
  if (req.method && req.method !== "GET") {
    res.writeHead(405, { allow: "GET", "cache-control": "no-store" });
    res.end("Method not allowed");
    return;
  }
  try {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(protectedResourceMetadata(publicBaseUrl(req))));
  } catch {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ error: "hosted_mcp_unavailable" }));
  }
}
