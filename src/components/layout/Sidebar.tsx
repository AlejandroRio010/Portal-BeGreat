"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

interface SidebarProps {
  nombre: string;
  identificador: string;
  role: "admin" | "colaborador";
}

const colaboradorNav = [
  { href: "/portal",                          label: "Inicio",                exact: true },
  { href: "/portal/alta-operacion",           label: "Alta nueva operación",  exact: false },
  { href: "/portal/operaciones/consultoria",  label: "Consultoría financiera",exact: false },
  { href: "/portal/operaciones/renting",      label: "Renting de equipos",    exact: false },
  { href: "/portal/clientes",                 label: "Mis clientes",          exact: false },
  { href: "/portal/historial",                label: "Historial & Resumen",   exact: false },
  { href: "/portal/perfil",                   label: "Mi perfil",             exact: false },
  { href: "/portal/contacto",                 label: "Contacto",              exact: false },
];

const adminNav = [
  { href: "/admin",               label: "Inicio",         exact: true },
  { href: "/admin/operaciones",   label: "Operaciones",    exact: false },
  { href: "/admin/operaciones/consultoria", label: "→ Consultoría", exact: false },
  { href: "/admin/operaciones/renting",     label: "→ Renting",     exact: false },
  { href: "/admin/alta-operacion",         label: "+ Alta operación", exact: false },
  { href: "/admin/colaboradores", label: "Colaboradores",  exact: false },
  { href: "/admin/clientes",      label: "Clientes",             exact: false },
  { href: "/admin/proveedores",   label: "Proveedores",          exact: false },
  { href: "/admin/entidades",     label: "Entidades financieras",exact: false },
  { href: "/admin/configuracion", label: "Configuración",        exact: false },
];

export default function Sidebar({ nombre, identificador, role }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : colaboradorNav;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-[#2E1A47] text-white z-50">

      {/* Logo — centrado */}
      <div className="flex items-center justify-center px-6 py-6 border-b border-white/10">
        <Image
          src="/begreat-logo-blanco.png"
          alt="BeGreat Consulting"
          width={148}
          height={44}
          className="object-contain"
          priority
        />
      </div>

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
              <span className="px-5 py-2.5 flex-1 truncate">{item.label}</span>
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
