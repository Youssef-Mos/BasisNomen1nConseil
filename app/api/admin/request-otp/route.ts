import { NextRequest } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  // Rate limit disabled while we're validating the admin flow. Re-enable
  // before exposing the endpoint publicly.
  // const recentOtp = await prisma.adminOtp.findFirst({
  //   where: {
  //     createdAt: { gt: new Date(Date.now() - 60 * 1000) },
  //   },
  // });
  // if (recentOtp) {
  //   return Response.json({ error: "Too many requests" }, { status: 429 });
  // }

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

  // Always log the code on the server so we can recover it from Railway logs
  // when SMTP misbehaves. Safe to remove once Gmail delivery is confirmed.
  console.log(`[admin-otp] generated code=${code} for=${process.env.ADMIN_EMAIL}`);

  // Gmail SMTP via app password. Set GMAIL_USER + GMAIL_APP_PASSWORD in env.
  // Short timeouts so a failing Gmail handshake can't hang the request.
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 5_000,
  });

  // Fire-and-forget: respond immediately so the UI never hangs on SMTP.
  // The OTP is already persisted in the DB, so the admin can log in even
  // if the email is delayed or fails.
  transporter
    .sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "BasisNomen — Code d'accès admin",
      text: `Votre code d'accès : ${code}\nCe code reste valide jusqu'à ce qu'un nouveau soit demandé. Ne pas partager.`,
    })
    .then(() => {
      console.log(`[admin-otp] email sent to ${process.env.ADMIN_EMAIL}`);
    })
    .catch((err) => {
      console.error(
        `[admin-otp] email delivery failed:`,
        err instanceof Error ? err.message : err,
      );
    });

  return Response.json({ success: true });
}
