import type { IncomingMessage, ServerResponse } from "node:http";

export type RequestWithBody = IncomingMessage & { body?: unknown };

export const SMALL_REQUEST_BODY_LIMIT_BYTES = 16 * 1024;
export const MCP_REQUEST_BODY_LIMIT_BYTES = 1024 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Request body exceeds ${limitBytes} byte limit`);
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidRequestBodyError extends Error {
  constructor(message = "Invalid request body") {
    super(message);
    this.name = "InvalidRequestBodyError";
  }
}

export async function readJsonBody(
  req: RequestWithBody,
  limitBytes: number,
): Promise<Record<string, unknown>> {
  const body = await readBodyValue(req, limitBytes);
  if (body === undefined || body === "") return {};
  if (isRecord(body)) return body;
  if (Buffer.isBuffer(body)) return parseJsonObject(body.toString("utf8"));
  if (typeof body === "string") return parseJsonObject(body);
  throw new InvalidRequestBodyError("JSON body must be an object");
}

export async function readFormBody(
  req: RequestWithBody,
  limitBytes: number,
): Promise<URLSearchParams> {
  const body = await readBodyValue(req, limitBytes);
  if (body === undefined || body === "") return new URLSearchParams();
  if (typeof body === "string") return new URLSearchParams(body);
  if (Buffer.isBuffer(body)) return new URLSearchParams(body.toString("utf8"));
  if (!isRecord(body)) throw new InvalidRequestBodyError("Form body must be an object");

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") {
      throw new InvalidRequestBodyError(`Form field ${key} must be a string`);
    }
    params.append(key, value);
  }
  return params;
}

export async function readMcpBody(
  req: RequestWithBody,
): Promise<unknown> {
  const body = await readBodyValue(req, MCP_REQUEST_BODY_LIMIT_BYTES);
  if (body === undefined || body === "") return undefined;
  if (Buffer.isBuffer(body)) return parseJson(body.toString("utf8"));
  if (typeof body === "string") return parseJson(body);
  return body;
}

export function writeRequestBodyTooLarge(
  res: ServerResponse,
  error: RequestBodyTooLargeError,
): void {
  res.writeHead(413, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify({
    error: "request_too_large",
    message: error.message,
  }));
}

export function isRequestBodyTooLarge(error: unknown): error is RequestBodyTooLargeError {
  return error instanceof RequestBodyTooLargeError;
}

export function isInvalidRequestBody(error: unknown): error is InvalidRequestBodyError {
  return error instanceof InvalidRequestBodyError;
}

async function readBodyValue(req: RequestWithBody, limitBytes: number): Promise<unknown> {
  const declaredLength = firstHeader(req.headers["content-length"]);
  if (declaredLength) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > limitBytes) {
      throw new RequestBodyTooLargeError(limitBytes);
    }
  }

  if (req.body !== undefined) {
    const size = serializedByteLength(req.body);
    if (size > limitBytes) throw new RequestBodyTooLargeError(limitBytes);
    return req.body;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > limitBytes) throw new RequestBodyTooLargeError(limitBytes);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function serializedByteLength(value: unknown): number {
  if (Buffer.isBuffer(value)) return value.byteLength;
  if (typeof value === "string") return Buffer.byteLength(value, "utf8");
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    throw new InvalidRequestBodyError("Request body is not serializable");
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) throw new InvalidRequestBodyError("JSON body must be an object");
  return parsed;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidRequestBodyError("Invalid JSON body");
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
