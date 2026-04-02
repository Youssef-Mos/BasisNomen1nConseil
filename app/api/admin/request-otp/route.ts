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

  // Store the new OTP (hashed), valid for 10 minutes
  await prisma.adminOtp.create({
    data: {
      code: hashed,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Send the code by email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: "BasisNomen — Code d'accès admin",
      text: `Votre code d'accès : ${code}\nValide 10 minutes. Ne pas partager.`,
    });
  } catch {
    return Response.json({ error: "Email delivery failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
