import { NextRequest, NextResponse } from "next/server";
// import { jwtVerify } from "jose"; // unused while auth is disabled

// const SECRET = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root → /explore
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // ─── AUTH DISABLED ─────────────────────────────────────────────────────────
  // Temporary global bypass while the OTP / Gmail flow is being validated.
  // Everything below is the original protection logic — restore by deleting
  // this early return.
  return NextResponse.next();

  // Public paths — always pass through
  // const publicPaths = [
  //   "/explore",
  //   "/api/admin/request-otp",
  //   "/api/admin/verify-otp",
  //   "/admin/login",
  //   "/api/crop",
  // ];
  // if (publicPaths.some((p) => pathname.startsWith(p))) {
  //   return NextResponse.next();
  // }
  //
  // // Protected paths — require valid session
  // const protectedPaths = ["/admin", "/api/rectangles", "/api/documents", "/api/analyze", "/api/norms"];
  // const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  //
  // if (!isProtected) return NextResponse.next();
  //
  // // DEV BYPASS — remove before production
  // if (process.env.NODE_ENV === "development") return NextResponse.next();
  //
  // const token = request.cookies.get("admin_session")?.value;
  // if (!token) {
  //   if (pathname.startsWith("/api/")) {
  //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  //   }
  //   return NextResponse.redirect(new URL("/admin/login", request.url));
  // }
  //
  // try {
  //   await jwtVerify(token, SECRET);
  //   return NextResponse.next();
  // } catch {
  //   if (pathname.startsWith("/api/")) {
  //     return NextResponse.json({ error: "Session expired" }, { status: 401 });
  //   }
  //   return NextResponse.redirect(new URL("/admin/login", request.url));
  // }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf-pages).*)"],
};
