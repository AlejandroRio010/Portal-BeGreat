import { db } from "@/db";
import { suppliers, collaborators, operations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}
function fmtEur(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(val));
}

const STATUS_BADGE: Record<string, string> = {
  pendiente_de_validar: "bg-amber-50 text-amber-700 border border-amber-200",
  activa: "bg-blue-50 text-blue-700 border border-blue-200",
  archivada: "bg-gray-100 text-gray-500 border border-gray-200",
};
const STATUS_LABEL: Record<string, string> = {
  pendiente_de_validar: "Pendiente",
  activa: "En curso",
  archivada: "Archivada",
};

export default async function ProveedorFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prov] = await db
    .select({
      id: suppliers.id,
      nombre: suppliers.nombre,
      email: suppliers.email,
      telefono: suppliers.telefono,
      web: suppliers.web,
      persona_contacto: suppliers.persona_contacto,
      contacto_email: suppliers.contacto_email,
      contacto_telefono: suppliers.contacto_telefono,
      created_at: suppliers.created_at,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
    })
    .from(suppliers)
    .leftJoin(collaborators, eq(suppliers.collaborator_id, collaborators.id))
    .where(eq(suppliers.id, id))
    .limit(1);

  if (!prov) notFound();

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_begreat: operations.comision_begreat,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.supplier_id, id))
    .orderBy(operations.created_at);

  const inicial = prov.nombre.charAt(0).toUpperCase();
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/proveedores" className="hover:text-[#2E1A47] font-medium">Proveedores</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{prov.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none">
            {inicial}
          </div>
          <div>
            <p className="text-white text-xl font-bold">{prov.nombre}</p>
            {prov.web && <p className="text-white/50 text-xs mt-0.5">{prov.web}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {prov.colaborador_nombre && (
            <span className="text-white/70 text-xs">Colaborador: <span className="text-white font-semibold">{prov.colaborador_nombre}</span></span>
          )}
          <span className="text-white/50 text-xs">Alta: {fmtDate(prov.created_at)}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 flex overflow-hidden">
        <div className="flex-1 bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Operaciones</p>
          <p className="text-white text-3xl font-black">{ops.length}</p>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex-1 bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Importe total</p>
          <p className="text-white text-3xl font-black">{totalImporte > 0 ? fmtEur(String(totalImporte)) : "—"}</p>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Datos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos del proveedor</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["Email", prov.email],
                ["Teléfono", prov.telefono],
                ["Web", prov.web],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {(prov.persona_contacto || prov.contacto_email || prov.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Persona de contacto</h3>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {[
                  ["Nombre", prov.persona_contacto],
                  ["Email", prov.contacto_email],
                  ["Teléfono", prov.contacto_telefono],
                ].map(([label, value]) =>
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
        </div>

        {/* Operaciones */}
        <div className="col-span-2 bg-white border border-gray-200">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones asociadas</h3>
          </div>
          {ops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin operaciones asociadas a este proveedor.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map((op) => (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">{op.nombre ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 max-w-[120px] truncate">{op.client_nombre ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                        {op.pipeline_key === "renting" ? "Renting" : "Consultoría"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[op.status] ?? ""}`}>
                        {STATUS_LABEL[op.status] ?? op.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{fmtEur(op.importe)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(op.created_at)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
