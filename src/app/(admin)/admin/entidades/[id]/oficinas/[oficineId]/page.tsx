import { db } from "@/db";
import { entityOffices, financialEntities, operations, clients, entityOfficeContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import OficinaEditForm from "./OficinaEditForm";
import ContactosOficinaPanel from "./ContactosOficinaPanel";
import NotasForm from "../../../NotasForm";

function fmtEur(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(val));
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  pendiente_de_validar: { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" },
  activa:               { bg: "bg-blue-50 text-blue-700 border border-blue-200",   label: "En curso" },
  archivada:            { bg: "bg-gray-100 text-gray-500 border border-gray-200",  label: "Archivada" },
};

export default async function OficinaFichaPage({
  params,
}: {
  params: Promise<{ id: string; oficineId: string }>;
}) {
  const { id: entityId, oficineId } = await params;

  const [oficina] = await db.select().from(entityOffices).where(eq(entityOffices.id, oficineId)).limit(1);
  if (!oficina) notFound();

  const [entidad] = await db.select().from(financialEntities).where(eq(financialEntities.id, entityId)).limit(1);
  if (!entidad) notFound();

  const contactos = await db.select().from(entityOfficeContacts).where(eq(entityOfficeContacts.office_id, oficineId)).orderBy(entityOfficeContacts.created_at);

  // Ops linked to this office
  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.entity_office_id, oficineId))
    .orderBy(operations.created_at);

  const FASES_APROBADAS = ["Operación aprobada", "Contrato firmado", "Honorarios pagados", "Condiciones aceptadas", "Transferencia realizada"];
  const FASES_ESTUDIO   = ["Pre-análisis", "Firma de honorarios", "En estudio por entidad"];

  const opsAprobadas = ops.filter((o) => FASES_APROBADAS.includes(o.fase));
  const opsEstudio   = ops.filter((o) => FASES_ESTUDIO.includes(o.fase));
  const totalFinanciado = opsAprobadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const totalPendiente  = opsEstudio.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  const inicial = oficina.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/entidades" className="hover:text-[#2E1A47] font-medium">Entidades financieras</Link>
        <span>/</span>
        <Link href={`/admin/entidades/${entityId}`} className="hover:text-[#2E1A47] font-medium">{entidad.nombre}</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{oficina.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none">
            {inicial}
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium mb-0.5">{entidad.nombre}</p>
            <p className="text-white text-xl font-bold">{oficina.nombre}</p>
            {oficina.ciudad && <p className="text-white/50 text-xs mt-0.5">{oficina.ciudad}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-white/50 text-xs">{ops.length} operación{ops.length !== 1 ? "es" : ""} registrada{ops.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops aprobadas / firmadas</p>
            <p className="text-white text-3xl font-black">{opsAprobadas.length}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">de {ops.length} totales</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
            <p className="text-white text-2xl font-black leading-tight">{totalFinanciado > 0 ? fmtEur(String(totalFinanciado)) : "—"}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">importe acumulado</p>
          </div>
        </div>
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops en estudio</p>
            <p className="text-[#2E1A47] text-3xl font-black">{opsEstudio.length}</p>
            <p className="text-[#2E1A47]/40 text-[9px] mt-1 uppercase tracking-wide">pendientes de aprobar</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación pendiente</p>
            <p className="text-[#2E1A47] text-2xl font-black leading-tight">{totalPendiente > 0 ? fmtEur(String(totalPendiente)) : "—"}</p>
            <p className="text-[#2E1A47]/40 text-[9px] mt-1 uppercase tracking-wide">en proceso</p>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: Datos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la oficina</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {([
                ["Ciudad", oficina.ciudad],
                ["Dirección", oficina.direccion],
                ["Email", oficina.email],
                ["Teléfono", oficina.telefono],
              ] as [string, string | null][]).map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {(oficina.persona_contacto || oficina.contacto_email || oficina.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contacto principal</h3>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {([
                  ["Nombre", oficina.persona_contacto],
                  ["Email", oficina.contacto_email],
                  ["Teléfono", oficina.contacto_telefono],
                ] as [string, string | null][]).map(([label, value]) =>
                  value ? (
                    <div key={label} className="py-2.5 flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {oficina.notas && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Notas internas</h3>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{oficina.notas}</p>
            </div>
          )}
          <ContactosOficinaPanel
            contactos={contactos.map(c => ({ ...c, entityId, officeId: oficineId }))}
            officeId={oficineId}
            entityId={entityId}
          />

          <NotasForm officeId={oficineId} initialNotas={oficina.notas ?? null} />

          <OficinaEditForm oficina={oficina} />
        </div>

        <div className="col-span-2" />
      </div>

      {/* Operaciones */}
      <div className="mx-8 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Operaciones estudiadas</h2>
          <span className="text-xs text-gray-400">{ops.length} operación{ops.length !== 1 ? "es" : ""}</span>
        </div>
        <div className="bg-white border border-gray-200">
          {ops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Ninguna operación vinculada a esta oficina todavía.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operación</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fase</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map((op) => {
                  const badge = STATUS_BADGE[op.status] ?? STATUS_BADGE.activa;
                  return (
                    <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-[120px] truncate">{op.client_nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium max-w-[140px] truncate">{op.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[120px] truncate">{op.fase}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 font-medium">{fmtEur(op.importe)}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(op.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
