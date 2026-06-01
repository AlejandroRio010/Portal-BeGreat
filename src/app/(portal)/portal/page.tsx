import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  { href: "/portal/alta-operacion",          label: "Alta nueva operación",   sub: "Registra una nueva operación" },
  { href: "/portal/operaciones/consultoria", label: "Consultoría financiera", sub: "Pólizas, leasing, préstamos..." },
  { href: "/portal/operaciones/renting",     label: "Renting de equipos",     sub: "Industrial y tecnológico" },
  { href: "/portal/historial",               label: "Historial & Resumen",    sub: "Tus métricas y comisiones" },
  { href: "/portal/perfil",                  label: "Mi perfil",              sub: "Datos de tu empresa" },
  { href: "/portal/contacto",                label: "Contacto BeGreat",       sub: "Rita & Alejandro" },
];

export default async function PortalHomePage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select({ nombre: collaborators.nombre, logo_url: collaborators.logo_url, identificador: collaborators.identificador })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const ops = await db.select({ status: operations.status }).from(operations).where(eq(operations.collaborator_id, userId));
  const pendientes = ops.filter((o) => o.status === "pendiente_de_validar").length;
  const activas = ops.filter((o) => o.status === "activa").length;

  return (
    <div>

      {/* ── Rectangular banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#1a0f2e] mb-6" style={{ height: 200 }}>
        <Image src="/begreat-banner.jpg" alt="BeGreat" fill className="object-cover opacity-35" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0f2e] via-[#2E1A47]/70 to-transparent" />

        <div className="relative z-10 flex items-center justify-between h-full px-10">
          {/* Left: BeGreat logo only */}
          <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={180} height={54} className="object-contain" />

          {/* Right: welcome + stats — separated clearly */}
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Portal de colaboradores</p>
            <h1 className="text-3xl font-bold text-white mb-0.5">
              Bienvenido, {colab?.nombre?.split(" ")[0]}
            </h1>
            <p className="text-white/30 text-xs mb-5">{colab?.identificador}</p>
            <div className="flex gap-3 justify-end">
              <div className="bg-white/10 border border-white/10 px-5 py-2.5 text-center">
                <p className="text-xl font-black text-white">{activas}</p>
                <p className="text-white/50 text-xs mt-0.5">Activas</p>
              </div>
              <div className="bg-white/10 border border-white/10 px-5 py-2.5 text-center">
                <p className="text-xl font-black text-amber-300">{pendientes}</p>
                <p className="text-white/50 text-xs mt-0.5">Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below banner: logo square + tiles ─────────────────────── */}
      <div className="flex gap-6 items-stretch">

        {/* Logo square */}
        <div className="flex-shrink-0 bg-white border border-gray-200 flex flex-col items-center justify-center gap-5 p-6" style={{ width: 220 }}>
          <Image src="/begreat-logo.png" alt="BeGreat Consulting" width={140} height={42} className="object-contain" />
          {colab?.logo_url ? (
            <>
              <div className="w-full h-px bg-gray-100" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={colab.logo_url} alt="Logo colaborador" style={{ maxHeight: 42, maxWidth: 140, objectFit: "contain" }} />
            </>
          ) : (
            <p className="text-xs text-gray-300 text-center">Sube tu logo en Mi perfil</p>
          )}
        </div>

        {/* Tiles grid — fills remaining space, same height as logo square */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col justify-between p-5 bg-white border border-gray-200 transition-all duration-200 hover:bg-[#2E1A47] hover:border-[#2E1A47]"
              style={{ borderRadius: 2 }}
            >
              <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors duration-200">
                {tile.label}
              </p>
              <div className="flex items-end justify-between mt-3">
                <p className="text-xs text-gray-400 group-hover:text-white/60 transition-colors duration-200">{tile.sub}</p>
                <span className="text-base font-light text-gray-300 group-hover:text-white/60 transition-all duration-200 group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
