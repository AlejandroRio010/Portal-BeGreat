"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

interface SidebarProps {
  nombre: string;
  identificador: string;
  role: "admin" | "colaborador" | "proveedor";
  puedeVerEntidades?: boolean;
  nivelEntidades?: number;
}

const colaboradorNav = [
  { href: "/portal",                          label: "Inicio",                exact: true },
  { href: "/portal/alta-operacion",           label: "Alta nueva operación",  exact: false },
  { href: "/portal/historial",                label: "Historial & Resumen",   exact: false },
  { href: "/portal/operaciones/consultoria",  label: "Consultoría financiera",exact: false, sub: true },
  { href: "/portal/operaciones/renting",      label: "Renting de equipos",    exact: false, sub: true },
  { href: "/portal/cotizador",                label: "Cotizador renting",     exact: false },
  { href: "/portal/clientes",                 label: "Mis clientes",          exact: false },
  { href: "/portal/contactos",                label: "Personas de contacto",  exact: false },
  { href: "/portal/grupos",                   label: "Grupos empresariales",  exact: false },
  { href: "/portal/proveedores",              label: "Mis proveedores",       exact: false },
  { href: "/portal/perfil",                   label: "Mi perfil",             exact: false },
  { href: "/portal/contacto",                 label: "Contacto",              exact: false },
];

const proveedorNav = [
  { href: "/proveedor",                         label: "Inicio",                exact: true },
  { href: "/proveedor/alta-operacion",           label: "Alta nueva operación",  exact: false },
  { href: "/proveedor/operaciones/renting",      label: "Funnel de renting",     exact: false },
  { href: "/proveedor/cotizador",                label: "Cotizador renting",     exact: false },
  { href: "/proveedor/clientes",                 label: "Mis clientes",          exact: false },
  { href: "/proveedor/historial",                label: "Historial de operaciones", exact: false },
  { href: "/proveedor/perfil",                   label: "Mi perfil",             exact: false },
  { href: "/proveedor/contacto",                 label: "Contacto",              exact: false },
];

const adminNav = [
  { href: "/admin",                         label: "Inicio",                exact: true },
  { href: "/admin/alta-operacion",          label: "Alta nueva operación",  exact: false },
  { href: "/admin/historial",               label: "Historial & Resumen",   exact: false },
  { href: "/admin/operaciones/consultoria", label: "Consultoría financiera", exact: false, sub: true },
  { href: "/admin/operaciones/renting",     label: "Renting de equipos",     exact: false, sub: true },
  { href: "/admin/cotizador",     label: "Cotizador renting",    exact: false },
  { href: "/admin/colaboradores", label: "Colaboradores",  exact: false },
  { href: "/admin/clientes",      label: "Clientes",             exact: false },
  { href: "/admin/contactos",     label: "Personas de contacto", exact: false },
  { href: "/admin/grupos",        label: "Grupos empresariales", exact: false },
  { href: "/admin/proveedores",   label: "Proveedores",          exact: false },
  { href: "/admin/entidades",     label: "Entidades financieras",exact: false },
  { href: "/admin/configuracion", label: "Configuración",        exact: false },
];

export default function Sidebar({ nombre, identificador, role, puedeVerEntidades, nivelEntidades }: SidebarProps) {
  const pathname = usePathname();
  const baseNav = role === "admin" ? adminNav : role === "proveedor" ? proveedorNav : colaboradorNav;
  const showEntidades = nivelEntidades !== undefined ? nivelEntidades <= 2 : puedeVerEntidades;
  let nav = baseNav;
  if (role === "colaborador" && showEntidades) {
    nav = [...colaboradorNav.slice(0, -2), { href: "/portal/entidades", label: "Entidades financieras", exact: false }, ...colaboradorNav.slice(-2)];
  } else if (role === "proveedor" && showEntidades) {
    nav = [...proveedorNav.slice(0, -2), { href: "/proveedor/entidades", label: "Entidades financieras", exact: false }, ...proveedorNav.slice(-2)];
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-[#2E1A47] text-white z-50">

      {/* Logo — centrado, link al inicio */}
      <Link href={role === "admin" ? "/admin" : role === "proveedor" ? "/proveedor" : "/portal"} className="flex items-center justify-center px-6 py-6 border-b border-white/10 hover:bg-white/5 transition-colors">
        <Image
          src="/begreat-logo-blanco.png"
          alt="BeGreat Consulting"
          width={148}
          height={44}
          className="object-contain"
          priority
        />
      </Link>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 uppercase">
            {nombre.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{nombre}</p>
            <p className="text-xs text-white/35 mt-0.5">{identificador}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map((item) => {
          const sub = (item as any).sub;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-0 text-sm transition-all ${
                active
                  ? "bg-white/12 text-white font-semibold border-l-2 border-white/70"
                  : "text-white/55 hover:bg-white/7 hover:text-white/90 border-l-2 border-transparent"
              }`}
            >
              <span className={`py-2.5 flex-1 truncate ${sub ? "pl-9 pr-5 text-[13px]" : "px-5"}`}>
                {sub && <span className="text-white/35 mr-1.5">→</span>}{item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-white/35 hover:text-white/65 transition-colors uppercase tracking-wider"
        >
          Cerrar sesión →
        </button>
      </div>
    </aside>
  );
}
