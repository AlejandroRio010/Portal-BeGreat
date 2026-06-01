import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  {
    href: "/portal/alta-operacion",
    label: "Alta nueva\noperación",
    icon: "✦",
    bg: "bg-[#2E1A47]",
    text: "text-white",
  },
  {
    href: "/portal/operaciones/consultoria",
    label: "Consultoría\nfinanciera",
    icon: "◈",
    bg: "bg-[#5a3d80]",
    text: "text-white",
  },
  {
    href: "/portal/operaciones/renting",
    label: "Operaciones\nde Renting",
    icon: "◉",
    bg: "bg-[#7c5fa8]",
    text: "text-white",
  },
  {
    href: "/portal/historial",
    label: "Historial &\nResumen",
    icon: "◎",
    bg: "bg-[#EEEBF3]",
    text: "text-[#2E1A47]",
  },
  {
    href: "/portal/perfil",
    label: "Mi\nPerfil",
    icon: "◐",
    bg: "bg-white border border-[#2E1A47]/20",
    text: "text-[#2E1A47]",
  },
  {
    href: "/portal/contacto",
    label: "Contactar\ncon BeGreat",
    icon: "◑",
    bg: "bg-[#2E1A47]/10",
    text: "text-[#2E1A47]",
  },
];

export default async function PortalHomePage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select({
      nombre: collaborators.nombre,
      logo_url: collaborators.logo_url,
      identificador: collaborators.identificador,
    })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const ops = await db
    .select({ status: operations.status })
    .from(operations)
    .where(eq(operations.collaborator_id, userId));

  const pendientes = ops.filter((o) => o.status === "pendiente_de_validar").length;
  const activas = ops.filter((o) => o.status === "activa").length;

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#2E1A47]" style={{ minHeight: 260 }}>
        {/* Purple gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E1A47] via-[#4a2d72] to-[#1a0f2e]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex items-center justify-between h-full px-10 py-10">
          {/* Left: logos */}
          <div className="flex items-center gap-8">
            {/* BeGreat logo placeholder */}
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white tracking-tight leading-tight">BEGREAT</span>
              <span className="text-sm font-light text-white/60 tracking-widest uppercase">Consulting</span>
            </div>

            {colab?.logo_url && (
              <>
                <div className="w-px h-12 bg-white/20" />
                <div className="bg-white rounded-xl px-4 py-2 flex items-center justify-center" style={{ minWidth: 100, minHeight: 56 }}>
                  <Image src={colab.logo_url} alt="Logo colaborador" width={100} height={44} className="object-contain max-h-11" />
                </div>
              </>
            )}
          </div>

          {/* Right: welcome text */}
          <div className="text-right">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Portal de colaborador</p>
            <h1 className="text-3xl font-bold text-white mb-2">
              Bienvenido, {colab?.nombre?.split(" ")[0]}
            </h1>
            <p className="text-white/60 text-sm">{colab?.identificador}</p>

            {/* Quick stats */}
            <div className="flex gap-4 justify-end mt-5">
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-white">{activas}</p>
                <p className="text-white/60 text-xs mt-0.5">Operaciones activas</p>
              </div>
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-orange-300">{pendientes}</p>
                <p className="text-white/60 text-xs mt-0.5">Pendientes de validar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick access tiles */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-3 gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`${tile.bg} ${tile.text} rounded-2xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`}
              style={{ minHeight: 130 }}
            >
              <span className="text-3xl opacity-60">{tile.icon}</span>
              <p className="text-sm font-semibold leading-snug whitespace-pre-line mt-4">
                {tile.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
