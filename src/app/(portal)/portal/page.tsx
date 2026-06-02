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

function fmt(n: number) {
  return n.toLocaleString("es-ES") + " €";
}

export default async function PortalHomePage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select({ nombre: collaborators.nombre, logo_url: collaborators.logo_url, identificador: collaborators.identificador })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  // Últimas 4 ops para la tabla inferior
  const recentOps = await db
    .select({
      id: operations.id,
      status: operations.status,
      fase: operations.fase,
      pipeline_key: operations.pipeline_key,
      comision_colaborador: operations.comision_colaborador,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.collaborator_id, userId))
    .orderBy(desc(operations.created_at))
    .limit(4);

  // Stats para KPIs
  const allOps = await db
    .select({ status: operations.status, fase: operations.fase, comision_colaborador: operations.comision_colaborador })
    .from(operations)
    .where(eq(operations.collaborator_id, userId));

  const firmadas = allOps.filter((o) => o.fase === "Contract Signed" || o.fase === "Fees Paid" || o.fase === "Transfered Made");
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar");
  const enCurso = allOps.filter((o) => o.status === "activa" && o.fase !== "Contract Signed" && o.fase !== "Fees Paid" && o.fase !== "Transfered Made");
  const totalComision = firmadas.reduce((s, o) => s + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);
  const feePendiente = [...pendientes, ...enCurso].reduce((s, o) => s + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);

  return (
    <div>

      {/* ── Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden mb-6 bg-[#1a0f2e] flex items-center justify-between px-10" style={{ height: 180 }}>
        <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-45" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(26,15,46,0.82) 0%, rgba(26,15,46,0.20) 45%, rgba(26,15,46,0.85) 100%)" }} />

        {/* Logo colaborador */}
        <div className="relative z-10">
          {colab?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={colab.logo_url} alt="Logo colaborador" style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
          )}
        </div>

        {/* Bienvenida */}
        <div className="relative z-10 text-right">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Portal de colaboradores</p>
          <h1 className="text-3xl font-bold text-white mb-1">
            Bienvenido, {colab?.nombre?.split(" ")[0]}
          </h1>
          <p className="text-white/30 text-xs">{colab?.identificador}</p>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#2E1A47] p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Ops. firmadas</p>
          <p className="text-3xl font-black text-white">{firmadas.length}</p>
        </div>
        <div className="bg-[#4a3060] p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">En estudio</p>
          <p className="text-3xl font-black text-white">{enCurso.length + pendientes.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Comisiones generadas</p>
          <p className="text-2xl font-black text-[#2E1A47]">{totalComision > 0 ? fmt(totalComision) : "—"}</p>
        </div>
        <div className="bg-[#EEEBF3] p-5">
          <p className="text-[#2E1A47]/60 text-xs font-semibold uppercase tracking-widest mb-3">Fee pendiente</p>
          <p className="text-2xl font-black text-[#2E1A47]">{feePendiente > 0 ? fmt(feePendiente) : "—"}</p>
        </div>
      </div>

      {/* ── Tiles — 4 columnas ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
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

      {/* ── Últimas operaciones ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Últimas operaciones</p>
          <Link href="/portal/historial" className="text-xs text-[#2E1A47] font-semibold hover:underline">
            Ver historial completo →
          </Link>
        </div>
        {recentOps.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-300">Todavía no has registrado ninguna operación.</p>
            <Link href="/portal/alta-operacion" className="block mt-3 text-xs font-semibold text-[#2E1A47] hover:underline">
              + Alta nueva operación
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOps.map((op) => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${op.pipeline_key === "consultoria" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-blue-50 text-blue-700"}`}>
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {op.status === "pendiente_de_validar" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Pendiente
                      </span>
                    ) : op.fase === "Contract Signed" || op.fase === "Fees Paid" || op.fase === "Transfered Made" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        Firmada ✓
                      </span>
                    ) : op.status === "archivada" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                        Denegada
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600">{op.fase}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {op.comision_colaborador
                      ? <span className="text-sm font-bold text-[#2E1A47]">{Number(op.comision_colaborador).toLocaleString("es-ES")} €</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">
                    {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3.5">
                    <Link href={`/portal/operaciones/${op.id}`} className="text-[#2E1A47] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
