import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface ValidateResult {
  valid: boolean;
  error?: string;
  body?: unknown;
}

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

export async function validateN8nRequest(
  request: NextRequest
): Promise<ValidateResult> {
  const apiKey = request.headers.get("X-Mjolnir-API-Key");
  const timestamp = request.headers.get("X-Mjolnir-Timestamp");
  const signature = request.headers.get("X-Mjolnir-Signature");

  // Validate API key
  const expectedApiKey = process.env.N8N_API_KEY;
  if (!expectedApiKey || !apiKey || apiKey !== expectedApiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // Validate timestamp
  if (!timestamp) {
    return { valid: false, error: "Missing timestamp" };
  }

  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return { valid: false, error: "Invalid timestamp" };
  }

  const now = Date.now();
  if (Math.abs(now - requestTime) > MAX_TIMESTAMP_DRIFT_MS) {
    return { valid: false, error: "Expired signature" };
  }

  // Read and validate signature
  if (!signature) {
    return { valid: false, error: "Missing signature" };
  }

  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { valid: false, error: "Server misconfigured" };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return { valid: false, error: "Unable to read request body" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Invalid signature" };
  }

  // Parse the body
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { valid: false, error: "Invalid JSON body" };
  }

  return { valid: true, body };
}

export function unauthorizedResponse(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbiddenResponse(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 403 });
}

export async function withN8nAuth(
  request: NextRequest,
  handler: (body: unknown) => Promise<NextResponse>
): Promise<NextResponse> {
  const result = await validateN8nRequest(request);

  if (!result.valid) {
    const isAuthError = result.error === "Invalid API key";
    if (isAuthError) {
      return unauthorizedResponse(result.error!);
    }
    return forbiddenResponse(result.error!);
  }

  return handler(result.body);
}
