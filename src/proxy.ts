import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function clearSessionAndRedirect(url: URL) {
  const res = NextResponse.redirect(url);
  // Borra cookies de sesión de NextAuth (ambas variantes http/https)
  res.cookies.delete("next-auth.session-token");
  res.cookies.delete("__Secure-next-auth.session-token");
  res.cookies.delete("next-auth.csrf-token");
  res.cookies.delete("__Host-next-auth.csrf-token");
  return res;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as any)?.role;

  // Si hay sesión pero el token está corrupto/incompleto → borrar y redirigir al login
  if (session && !role) {
    return clearSessionAndRedirect(new URL("/login", req.url));
  }

  // Rutas públicas de recuperación de contraseña (siempre accesibles)
  if (pathname === "/forgot-password" || pathname === "/reset-password") {
    return NextResponse.next();
  }

  function homeForRole(r: string) {
    return r === "admin" ? "/admin/operaciones" : r === "proveedor" ? "/proveedor" : "/portal";
  }

  // Public routes
  if (pathname === "/login" || pathname === "/") {
    if (session && role) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
    return NextResponse.next();
  }

  // Protected routes — sin sesión válida → login
  if (!session || !role) {
    return clearSessionAndRedirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  if (pathname.startsWith("/portal") && role !== "colaborador") {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  if (pathname.startsWith("/proveedor") && role !== "proveedor") {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Excluimos API, assets de Next y archivos estáticos (imágenes, fuentes…) para que
  // se sirvan sin pasar por el control de sesión (si no, en /login los logos se redirigen).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)).*)",
  ],
};
