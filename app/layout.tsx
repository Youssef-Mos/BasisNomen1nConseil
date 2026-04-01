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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply dark class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('theme');const sys=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&sys))document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
