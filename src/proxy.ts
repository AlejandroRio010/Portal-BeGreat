import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  if (pathname === "/login" || pathname === "/") {
    if (session) {
      const role = (session.user as any).role;
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin/operaciones" : "/portal/operaciones/consultoria", req.url)
      );
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (session.user as any).role;

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/portal/operaciones/consultoria", req.url));
  }

  if (pathname.startsWith("/portal") && role !== "colaborador") {
    return NextResponse.redirect(new URL("/admin/operaciones", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
