import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basis Norm Explorer",
  description: "SaaS document exploration platform — Admin & User interfaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
