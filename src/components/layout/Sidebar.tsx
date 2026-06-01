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
  { href: "/portal", label: "Inicio", icon: "⌂", exact: true },
  { href: "/portal/alta-operacion", label: "Alta nueva OP", icon: "✦" },
  { href: "/portal/operaciones/consultoria", label: "Consultoría financiera", icon: "💼" },
  { href: "/portal/operaciones/renting", label: "Renting de equipos", icon: "🖥" },
  { href: "/portal/historial", label: "Historial & Resumen", icon: "◎" },
  { href: "/portal/perfil", label: "Mi perfil", icon: "◐" },
  { href: "/portal/contacto", label: "Contacto", icon: "◑" },
];

const adminNav = [
  { href: "/admin/operaciones", label: "Operaciones", icon: "◈", exact: false },
  { href: "/admin/colaboradores", label: "Colaboradores", icon: "◐", exact: false },
  { href: "/admin/clientes", label: "Clientes", icon: "◉", exact: false },
  { href: "/admin/proveedores", label: "Proveedores", icon: "◎", exact: false },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙", exact: false },
];

export default function Sidebar({ nombre, identificador, role }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : colaboradorNav;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-[#2E1A47] text-white z-50 shadow-2xl">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={160} height={48} className="object-contain" priority />
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nombre}</p>
            <p className="text-xs text-white/40">{identificador}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm transition-all ${
                active
                  ? "bg-white/15 font-semibold text-white shadow-inner"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors w-full"
        >
          <span>→</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
