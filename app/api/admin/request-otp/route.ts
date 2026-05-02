import { NextRequest } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  // Rate limit: block if an OTP was created in the last 60 seconds
  const recentOtp = await prisma.adminOtp.findFirst({
    where: {
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recentOtp) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  // Generate a cryptographically secure 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const hashed = crypto.createHash("sha256").update(code).digest("hex");

  // Invalidate all existing unused OTPs
  await prisma.adminOtp.updateMany({
    where: { used: false },
    data: { used: true },
  });

  // Store the new OTP (hashed). Expiration set to year 9999 — effectively
  // no expiry while we're still validating the admin flow. Each new request
  // still invalidates the previous code via the updateMany above.
  await prisma.adminOtp.create({
    data: {
      code: hashed,
      expiresAt: new Date("9999-12-31T23:59:59Z"),
    },
  });

  // ─── Generic SMTP transport (commented out) ────────────────────────────────
  // Kept for reference — switch back when we move off the personal Gmail.
  //
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: parseInt(process.env.SMTP_PORT, 10),
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });

  // Gmail SMTP via app password. Set GMAIL_USER + GMAIL_APP_PASSWORD in env.
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "BasisNomen — Code d'accès admin",
      text: `Votre code d'accès : ${code}\nCe code reste valide jusqu'à ce qu'un nouveau soit demandé. Ne pas partager.`,
    });
  } catch {
    return Response.json({ error: "Email delivery failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
