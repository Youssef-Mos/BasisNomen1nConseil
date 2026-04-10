import { NextRequest } from "next/server";
import crypto from "crypto";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECRET = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("code" in body) ||
    typeof (body as Record<string, unknown>).code !== "string"
  ) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { code } = body as { code: string };

  // Validate format: exactly 6 digits
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "Invalid code format" }, { status: 400 });
  }

  const hashed = crypto.createHash("sha256").update(code).digest("hex");

  // Find the latest valid, unused OTP
  const otp = await prisma.adminOtp.findFirst({
    where: {
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.code !== hashed) {
    return Response.json({ error: "Invalid code" }, { status: 401 });
  }

  // Mark OTP as used
  await prisma.adminOtp.update({
    where: { id: otp.id },
    data: { used: true },
  });

  // Issue a signed JWT session token (8 hours)
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);

  // Set httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return Response.json({ success: true });
}
