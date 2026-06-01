"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  nombre: string;
  identificador: string;
  role: "admin" | "colaborador";
}

const colaboradorNav = [
  { href: "/portal/alta-operacion", label: "Alta nueva OP" },
  { href: "/portal/operaciones/consultoria", label: "Operaciones consultoría financiera" },
  { href: "/portal/operaciones/renting", label: "Operaciones de renting" },
  { href: "/portal/historial", label: "Historial" },
  { href: "/portal/perfil", label: "Mi perfil" },
  { href: "/portal/contacto", label: "Contacto" },
];

const adminNav = [
  { href: "/admin/operaciones", label: "Operaciones" },
  { href: "/admin/colaboradores", label: "Colaboradores" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default function Sidebar({ nombre, identificador, role }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : colaboradorNav;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-[#2E1A47] text-white z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">BEGREAT</span>
          <span className="text-sm font-light text-white/70">CONSULTING</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
          {role === "admin" ? "Administrador" : "Colaborador"}
        </p>
        <p className="font-semibold text-sm leading-tight">Hola, {nombre}</p>
        <p className="text-xs text-white/60 mt-0.5">{identificador}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                active
                  ? "bg-white/15 font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-white/60 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
