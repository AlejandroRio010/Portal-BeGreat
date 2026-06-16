import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const sessionCookie =
      request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-next-auth.session-token") ??
      request.cookies.get("next-auth.session-token");

    if (sessionCookie) {
      const response = NextResponse.next();
      response.cookies.delete("__Secure-authjs.session-token");
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      response.cookies.delete("next-auth.session-token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login"],
};
