import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  { href: "/portal/alta-operacion", label: "Alta nueva operación", sub: "Registra una nueva operación" },
  { href: "/portal/operaciones/consultoria", label: "Consultoría financiera", sub: "Pólizas, leasing, préstamos..." },
  { href: "/portal/operaciones/renting", label: "Renting de equipos", sub: "Industrial y tecnológico" },
  { href: "/portal/historial", label: "Historial & Resumen", sub: "Tus métricas y comisiones" },
  { href: "/portal/perfil", label: "Mi perfil", sub: "Datos de tu empresa" },
  { href: "/portal/contacto", label: "Contacto", sub: "Rita & Alejandro — BeGreat" },
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
      {/* Hero banner */}
      <div className="relative overflow-hidden mb-8 bg-[#1a0f2e]" style={{ minHeight: 240, borderRadius: 4 }}>
        {/* Background image */}
        <Image
          src="/begreat-banner.jpg"
          alt="BeGreat"
          fill
          className="object-cover opacity-40"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0f2e] via-[#2E1A47]/80 to-transparent" />

        <div className="relative z-10 flex items-center justify-between h-full px-10 py-10">
          {/* Left: logos */}
          <div className="flex items-center gap-8">
            <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={180} height={54} className="object-contain" />

            {colab?.logo_url && (
              <>
                <div className="w-px h-12 bg-white/20" />
                <div className="bg-white px-4 py-2 flex items-center justify-center" style={{ borderRadius: 2 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={colab.logo_url} alt="Logo colaborador" style={{ maxHeight: 44, maxWidth: 120, objectFit: "contain" }} />
                </div>
              </>
            )}
          </div>

          {/* Right */}
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Portal de colaborador</p>
            <h1 className="text-3xl font-bold text-white mb-1">
              Bienvenido, {colab?.nombre?.split(" ")[0]}
            </h1>
            <p className="text-white/40 text-xs mb-5">{colab?.identificador}</p>

            <div className="flex gap-3 justify-end">
              <div className="bg-white/10 border border-white/10 px-5 py-3 text-center" style={{ borderRadius: 2 }}>
                <p className="text-xl font-bold text-white">{activas}</p>
                <p className="text-white/50 text-xs mt-0.5">Operaciones activas</p>
              </div>
              <div className="bg-white/10 border border-white/10 px-5 py-3 text-center" style={{ borderRadius: 2 }}>
                <p className="text-xl font-bold text-amber-300">{pendientes}</p>
                <p className="text-white/50 text-xs mt-0.5">Pendientes de validar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile, i) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`group flex flex-col justify-between p-6 border transition-all hover:shadow-md ${
              i === 0
                ? "bg-[#2E1A47] border-[#2E1A47] text-white"
                : "bg-white border-gray-200 hover:border-[#2E1A47]/40 text-gray-800"
            }`}
            style={{ minHeight: 120, borderRadius: 2 }}
          >
            <p className={`text-sm font-semibold ${i === 0 ? "text-white" : "text-gray-900"}`}>
              {tile.label}
            </p>
            <div className="flex items-end justify-between mt-4">
              <p className={`text-xs ${i === 0 ? "text-white/60" : "text-gray-400"}`}>{tile.sub}</p>
              <span className={`text-lg font-light transition-transform group-hover:translate-x-1 ${i === 0 ? "text-white/60" : "text-gray-300"}`}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
