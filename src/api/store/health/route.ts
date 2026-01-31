import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: MedusaRequest): boolean {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const limit = 100; // requests per window
  const window = 60000; // 1 minute

  const current = rateLimitStore.get(ip as string);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip as string, { count: 1, resetTime: now + window });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Apply rate limiting
  if (!rateLimit(req)) {
    return res.status(429).json({
      message: "Too many requests, please try again later",
    });
  }

  res.json({
    message: "Crossbow Store API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
  return;
};
