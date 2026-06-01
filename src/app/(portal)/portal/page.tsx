import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  { href: "/portal/alta-operacion", label: "Alta nueva operación", sub: "Registra una nueva operación", accent: true },
  { href: "/portal/operaciones/consultoria", label: "Consultoría financiera", sub: "Pólizas, leasing, préstamos..." },
  { href: "/portal/operaciones/renting", label: "Renting de equipos", sub: "Industrial y tecnológico" },
  { href: "/portal/historial", label: "Historial & Resumen", sub: "Tus métricas y comisiones" },
  { href: "/portal/perfil", label: "Mi perfil", sub: "Datos de tu empresa" },
  { href: "/portal/contacto", label: "Contacto BeGreat", sub: "Rita & Alejandro" },
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
    <div className="flex gap-6 items-start">

      {/* ── LEFT: Hero card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden flex-shrink-0 bg-[#1a0f2e] flex flex-col justify-between" style={{ width: 320, minHeight: 520 }}>
        {/* Background image */}
        <Image
          src="/begreat-banner.jpg"
          alt="BeGreat"
          fill
          className="object-cover opacity-30"
          priority
        />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f2e]/60 via-[#2E1A47]/70 to-[#1a0f2e]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-8" style={{ minHeight: 520 }}>
          {/* Logos */}
          <div className="flex flex-col gap-5 flex-1">
            <Image
              src="/begreat-logo-blanco.png"
              alt="BeGreat Consulting"
              width={150}
              height={45}
              className="object-contain"
            />

            {colab?.logo_url && (
              <div className="bg-white px-4 py-2.5 flex items-center justify-center self-start" style={{ borderRadius: 2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={colab.logo_url}
                  alt="Logo colaborador"
                  style={{ maxHeight: 36, maxWidth: 110, objectFit: "contain" }}
                />
              </div>
            )}
          </div>

          {/* Welcome */}
          <div className="mt-auto">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Bienvenido</p>
            <h1 className="text-2xl font-bold text-white leading-tight mb-1">
              {colab?.nombre?.split(" ")[0]}
            </h1>
            <p className="text-white/30 text-xs mb-6">{colab?.identificador}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 border border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-white">{activas}</p>
                <p className="text-white/50 text-xs mt-0.5">Ops. activas</p>
              </div>
              <div className="bg-white/10 border border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-amber-300">{pendientes}</p>
                <p className="text-white/50 text-xs mt-0.5">Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Tiles grid ───────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-2 gap-3 content-start">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`group flex flex-col justify-between p-6 border transition-all hover:shadow-md ${
              tile.accent
                ? "bg-[#2E1A47] border-[#2E1A47] text-white"
                : "bg-white border-gray-200 hover:border-[#2E1A47]/40 text-gray-800"
            }`}
            style={{ minHeight: 120, borderRadius: 2 }}
          >
            <p className={`text-sm font-semibold ${tile.accent ? "text-white" : "text-gray-900"}`}>
              {tile.label}
            </p>
            <div className="flex items-end justify-between mt-4">
              <p className={`text-xs ${tile.accent ? "text-white/60" : "text-gray-400"}`}>{tile.sub}</p>
              <span className={`text-lg font-light transition-transform group-hover:translate-x-1 ${tile.accent ? "text-white/60" : "text-gray-300"}`}>→</span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
