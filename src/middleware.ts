import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/", "/auth/login", "/auth/signup", "/auth/create-pg", "/auth/two-factor"];
const authApiPath = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths & auth API
  if (publicPaths.includes(pathname) || pathname.startsWith(authApiPath) || pathname.startsWith("/api/pg/")) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
