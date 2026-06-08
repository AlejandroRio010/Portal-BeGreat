import { db } from "@/db";
import { clients, collaborators, contacts, operations, customFields, customFieldValues, clientNotes, clientGroups } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClienteEditForm from "./ClienteEditForm";
import ContactosAdminPanel from "./ContactosAdminPanel";
import NotesSection from "@/components/NotesSection";
import { getCnaeByCode } from "@/lib/cnaes";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}
function fmtEur(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(val));
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pendiente_de_validar: { bg: "bg-amber-50 text-amber-700 border border-amber-200", text: "", label: "Pendiente" },
  activa:               { bg: "bg-blue-50 text-blue-700 border border-blue-200",   text: "", label: "En curso" },
  archivada:            { bg: "bg-gray-100 text-gray-500 border border-gray-200",  text: "", label: "Archivada" },
};

export default async function AdminClienteFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [client] = await db
    .select({
      id: clients.id,
      nombre: clients.nombre,
      cif: clients.cif,
      email: clients.email,
      telefono: clients.telefono,
      web: clients.web,
      linkedin: clients.linkedin,
      nombre_comercial: clients.nombre_comercial,
      direccion: clients.direccion,
      cnae: clients.cnae,
      grupo_empresarial: clients.grupo_empresarial,
      group_id: clients.group_id,
      created_at: clients.created_at,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
    })
    .from(clients)
    .leftJoin(collaborators, eq(clients.collaborator_id, collaborators.id))
    .where(eq(clients.id, id))
    .limit(1);

  if (!client) notFound();

  const clientContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.client_id, id))
    .orderBy(contacts.nombre);

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      entidad_financiera: operations.entidad_financiera,
      created_at: operations.created_at,
    })
    .from(operations)
    .where(eq(operations.client_id, id))
    .orderBy(operations.created_at);

  const FASES_APROBADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];
  const FASES_ESTUDIO = ["Pre-análisis", "Firma de honorarios", "En estudio por entidad", "Operación aprobada", "Condiciones aceptadas"];

  // Campos personalizados del cliente
  const clienteCustomFields = await db.select().from(customFields).where(eq(customFields.entidad, "cliente")).orderBy(asc(customFields.orden));
  const clienteCustomValues = await db.select().from(customFieldValues).where(eq(customFieldValues.entity_id, id));
  const notes = await db.select().from(clientNotes).where(eq(clientNotes.client_id, id)).orderBy(clientNotes.created_at);
  const grupos = await db.select({ id: clientGroups.id, nombre: clientGroups.nombre }).from(clientGroups).orderBy(clientGroups.nombre);

  const inicial = client.nombre.charAt(0).toUpperCase();

  const opsAprobadas = ops.filter((o) => FASES_APROBADAS.includes(o.fase));
  const opsEstudio   = ops.filter((o) => FASES_ESTUDIO.includes(o.fase));

  const totalFinanciado = opsAprobadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const totalPendiente  = opsEstudio.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/clientes" className="hover:text-[#2E1A47] font-medium">Clientes</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{client.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none">
            {inicial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{client.nombre}</p>
              {(client as any).codigo && <span className="text-[10px] font-bold font-mono bg-white/20 text-white px-2 py-0.5 tracking-wider">{(client as any).codigo}</span>}
            </div>
            {client.cif && <p className="text-white/60 text-xs mt-0.5 font-mono">{client.cif}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {client.colaborador_nombre && (
            <span className="text-white/70 text-xs">Colaborador: <span className="text-white font-semibold">{client.colaborador_nombre}</span></span>
          )}
          <span className="text-white/50 text-xs">Alta: {fmtDate(client.created_at)}</span>
        </div>
      </div>

      {/* KPIs — parejas */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        {/* Oscuro: firmadas / financiación conseguida */}
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops firmadas</p>
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
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5 border-r border-white/15">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops en estudio</p>
            <p className="text-white text-3xl font-black">{opsEstudio.length}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">pendientes de aprobar</p>
          </div>
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación pendiente</p>
            <p className="text-white text-2xl font-black leading-tight">{totalPendiente > 0 ? fmtEur(String(totalPendiente)) : "—"}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">en proceso</p>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: Datos + Contactos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["Nombre", client.nombre],
                ["Nombre comercial", client.nombre_comercial],
                ["CIF", client.cif],
                ["Email", client.email],
                ["Teléfono", client.telefono],
                ["Web", client.web],
                ["LinkedIn", client.linkedin],
                ["Dirección", client.direccion],
                ["CNAE", client.cnae ? (getCnaeByCode(client.cnae) ? `${getCnaeByCode(client.cnae)!.codigo} — ${getCnaeByCode(client.cnae)!.titulo}` : client.cnae) : null],
                // Campos personalizados rellenos
                ...clienteCustomFields
                  .filter((f) => {
                    const v = clienteCustomValues.find((cv) => cv.field_id === f.id);
                    return v && v.valor && v.valor.trim() !== "";
                  })
                  .map((f) => [f.etiqueta, clienteCustomValues.find((cv) => cv.field_id === f.id)?.valor ?? null] as [string, string | null]),
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "LinkedIn" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-semibold">LinkedIn →</a>
                    ) : label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                    )}
                  </div>
                ) : null
              )}
              {/* Grupo empresarial como link */}
              {client.group_id && client.grupo_empresarial && (
                <div className="py-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Grupo empresarial</span>
                  <Link href={`/admin/grupos/${client.group_id}`} className="text-sm text-[#2E1A47] font-semibold hover:underline">{client.grupo_empresarial} →</Link>
                </div>
              )}
            </div>
            <div className="px-5 pb-4">
              <ClienteEditForm grupos={grupos} client={{ id, nombre: client.nombre, cif: client.cif ?? null, email: client.email ?? null, telefono: client.telefono ?? null, web: client.web ?? null, linkedin: client.linkedin ?? null, nombre_comercial: client.nombre_comercial ?? null, direccion: client.direccion ?? null, cnae: client.cnae ?? null, grupo_empresarial: client.grupo_empresarial ?? null, group_id: client.group_id ?? null }} />
            </div>
          </div>

          <ContactosAdminPanel
            clientId={id}
            contactos={clientContacts.map(c => ({
              id: c.id,
              nombre: c.nombre,
              rol: c.rol ?? null,
              email: c.email ?? null,
              telefono: c.telefono ?? null,
              linkedin: c.linkedin ?? null,
            }))}
          />
        </div>

        {/* Col 2-3: Operaciones */}
        <div className="col-span-2 flex flex-col gap-6 min-w-0">
          <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones</h3>
          </div>
          {ops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin operaciones registradas para este cliente.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
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
                  const badge = op.status === "archivada"
                    ? FASES_APROBADAS.includes(op.fase)
                      ? { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Ganada ✓" }
                      : { bg: "bg-red-50 text-red-600 border border-red-200", label: "Denegada" }
                    : op.status === "pendiente_de_validar"
                      ? { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" }
                      : { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "En curso" };
                  return (
                    <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium max-w-[160px] truncate">{op.nombre ?? "—"}</td>
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
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
          </div>

          {/* Notas del cliente (no de ops) */}
          <NotesSection
            notes={notes}
            apiUrl={`/api/admin/clientes/${id}/notes`}
            placeholder="Añade una nota general sobre este cliente..."
            isAdmin={true}
          />
        </div>
      </div>
    </div>
  );
}
