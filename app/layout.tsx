import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basis Norm Explorer",
  description: "Base technique Next.js pour explorer des normes PDF structurees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
