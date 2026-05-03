import { NextRequest, NextResponse } from "next/server";
// import { jwtVerify } from "jose"; // unused while auth is disabled

// const SECRET = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── HTTP BASIC AUTH ───────────────────────────────────────────────────────
  // Single shared credential pair gating the whole site. Set SITE_USER and
  // SITE_PASSWORD as Railway env vars to override the defaults below.
  const expectedUser = process.env.SITE_USER || "admin";
  const expectedPass = process.env.SITE_PASSWORD || "BasisNomen2026!";

  const authHeader = request.headers.get("authorization");
  let authorized = false;

  if (authHeader?.startsWith("Basic ")) {
    try {
      const decoded = atob(authHeader.slice("Basic ".length).trim());
      const sepIdx = decoded.indexOf(":");
      if (sepIdx !== -1) {
        const user = decoded.slice(0, sepIdx);
        const pass = decoded.slice(sepIdx + 1);
        authorized = user === expectedUser && pass === expectedPass;
      }
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="BasisNomen", charset="UTF-8"',
      },
    });
  }

  // Redirect root → /explore (after auth so the prompt fires on first visit)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // ─── AUTH DISABLED ─────────────────────────────────────────────────────────
  // Old admin OTP flow — kept commented for reference. Basic Auth above is the
  // active gate. Restore by deleting this early return and the basic-auth block.
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
