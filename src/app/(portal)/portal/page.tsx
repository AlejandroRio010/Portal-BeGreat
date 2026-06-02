import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  { href: "/portal/alta-operacion",          label: "Alta nueva operación",    sub: "Registra una nueva operación" },
  { href: "/portal/operaciones/consultoria", label: "Consultoría financiera",  sub: "Pólizas, leasing, préstamos..." },
  { href: "/portal/operaciones/renting",     label: "Renting de equipos",      sub: "Industrial y tecnológico" },
  { href: "/portal/clientes",                label: "Mis clientes",            sub: "Empresas y contactos" },
  { href: "/portal/historial",               label: "Historial & Resumen",     sub: "Tus métricas y comisiones" },
  { href: "/portal/perfil",                  label: "Mi perfil",               sub: "Datos de tu empresa" },
  { href: "/portal/contacto",                label: "Contacto BeGreat",        sub: "Rita & Alejandro" },
];

export default async function PortalHomePage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select({ nombre: collaborators.nombre, logo_url: collaborators.logo_url, identificador: collaborators.identificador })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const ops = await db
    .select({ id: operations.id, status: operations.status, fase: operations.fase, pipeline_key: operations.pipeline_key, created_at: operations.created_at, client_nombre: clients.nombre })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.collaborator_id, userId))
    .orderBy(desc(operations.created_at))
    .limit(4);

  const allOps = await db.select({ status: operations.status }).from(operations).where(eq(operations.collaborator_id, userId));
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar").length;
  const activas = allOps.filter((o) => o.status === "activa").length;

  return (
    <div>

      {/* ── Banner con imagen de portada ───────────────────────────── */}
      <div className="relative overflow-hidden mb-6 bg-[#1a0f2e] flex items-center justify-between px-10" style={{ height: 180 }}>
        {/* Imagen de fondo */}
        <Image
          src="/cabecera-corporate.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-45"
          priority
        />
        {/* Overlay: franjas laterales más opacas para legibilidad */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(26,15,46,0.82) 0%, rgba(26,15,46,0.20) 45%, rgba(26,15,46,0.85) 100%)" }} />

        {/* Left: solo logo del colaborador */}
        <div className="relative z-10">
          {colab?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={colab.logo_url} alt="Logo colaborador" style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
          )}
        </div>

        {/* Right: welcome */}
        <div className="relative z-10 text-right">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Portal de colaboradores</p>
          <h1 className="text-3xl font-bold text-white mb-1">
            Bienvenido, {colab?.nombre?.split(" ")[0]}
          </h1>
          <p className="text-white/30 text-xs mb-4">{colab?.identificador}</p>
          <div className="flex gap-3 justify-end">
            <div className="bg-white/10 border border-white/15 px-5 py-2.5 text-center">
              <p className="text-xl font-black text-white">{activas}</p>
              <p className="text-white/50 text-xs mt-0.5">Activas</p>
            </div>
            <div className="bg-white/10 border border-white/15 px-5 py-2.5 text-center">
              <p className="text-xl font-black text-amber-300">{pendientes}</p>
              <p className="text-white/50 text-xs mt-0.5">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo: tiles + actividad reciente ─────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* Tiles — 2 columnas */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col justify-between p-5 bg-white border border-gray-200 transition-all duration-200 hover:bg-[#2E1A47] hover:border-[#2E1A47]"
              style={{ minHeight: 90 }}
            >
              <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors duration-200">
                {tile.label}
              </p>
              <div className="flex items-end justify-between mt-3">
                <p className="text-xs text-gray-400 group-hover:text-white/55 transition-colors duration-200">{tile.sub}</p>
                <span className="text-sm text-gray-300 group-hover:text-white/55 transition-all duration-200 group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Actividad reciente */}
        <div className="flex-shrink-0" style={{ width: 300 }}>
          <div className="bg-white border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Actividad reciente</p>
            </div>
            {ops.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-gray-300">Sin operaciones todavía.</p>
                <Link href="/portal/alta-operacion" className="block mt-3 text-xs font-semibold text-[#2E1A47] hover:underline">
                  + Alta nueva operación
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {ops.map((op) => (
                  <Link key={op.id} href={`/portal/operaciones/${op.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                    <div className={`w-2 h-2 flex-shrink-0 ${
                      op.status === "pendiente_de_validar" ? "bg-amber-400" :
                      op.fase === "Contract Signed" || op.fase === "Fees Paid" || op.fase === "Transfered Made" ? "bg-emerald-500" :
                      "bg-[#2E1A47]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{op.client_nombre ?? "—"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {op.status === "pendiente_de_validar" ? "Pendiente de validar" : op.fase}
                      </p>
                    </div>
                    <span className="text-xs text-gray-300 group-hover:text-[#2E1A47] transition-colors">→</span>
                  </Link>
                ))}
              </div>
            )}
            {ops.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/portal/historial" className="text-xs text-[#2E1A47] font-semibold hover:underline">
                  Ver todo el historial →
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
