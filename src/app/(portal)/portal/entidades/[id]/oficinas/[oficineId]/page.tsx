import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, entityOffices, financialEntities, operations, clients, entityOfficeContacts, officeNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import ContactosOficinaPanel from "@/app/(admin)/admin/entidades/[id]/oficinas/[oficineId]/ContactosOficinaPanel";
import { fmtEur } from "@/lib/format";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}
const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  pendiente_de_validar: { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" },
  activa:               { bg: "bg-blue-50 text-blue-700 border border-blue-200",   label: "En curso" },
  archivada:            { bg: "bg-gray-100 text-gray-500 border border-gray-200",  label: "Archivada" },
};

export default async function PortalOficinaFichaPage({ params }: { params: Promise<{ id: string; oficineId: string }> }) {
  const { id: entityId, oficineId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as any).collaboratorId as string;
  const [colab] = await db.select({ nivel_entidades: collaborators.nivel_entidades }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if ((colab?.nivel_entidades ?? 4) > 1) notFound();

  const [oficina] = await db.select().from(entityOffices).where(eq(entityOffices.id, oficineId)).limit(1);
  if (!oficina) notFound();
  const [entidad] = await db.select().from(financialEntities).where(eq(financialEntities.id, entityId)).limit(1);
  if (!entidad) notFound();

  const contactos = await db.select().from(entityOfficeContacts).where(eq(entityOfficeContacts.office_id, oficineId)).orderBy(entityOfficeContacts.created_at);
  const notes = await db.select().from(officeNotes).where(eq(officeNotes.office_id, oficineId)).orderBy(officeNotes.created_at);

  const ops = await db
    .select({ id: operations.id, nombre: operations.nombre, pipeline_key: operations.pipeline_key, fase: operations.fase, status: operations.status, importe: operations.importe, created_at: operations.created_at, client_nombre: clients.nombre })
    .from(operations).leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.entity_office_id, oficineId)).orderBy(operations.created_at);

  const FASES_APROBADAS = ["Operación aprobada", "Contrato firmado", "Honorarios pagados", "Condiciones aceptadas", "Transferencia realizada"];
  const FASES_ESTUDIO = ["Pre-análisis", "Firma de honorarios", "En estudio por entidad"];
  const opsAprobadas = ops.filter(o => FASES_APROBADAS.includes(o.fase));
  const opsEstudio = ops.filter(o => FASES_ESTUDIO.includes(o.fase));
  const totalFinanciado = opsAprobadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const totalPendiente = opsEstudio.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/entidades" className="hover:text-[#2E1A47] font-medium">Entidades financieras</Link>
        <span>/</span>
        <Link href={`/portal/entidades/${entityId}`} className="hover:text-[#2E1A47] font-medium">{entidad.nombre}</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{oficina.nombre}</span>
      </div>

      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{oficina.nombre.charAt(0)}</div>
          <div>
            <p className="text-white/60 text-xs font-medium mb-0.5">{entidad.nombre}</p>
            <p className="text-white text-xl font-bold">{oficina.nombre}</p>
            {oficina.ciudad && <p className="text-white/50 text-xs mt-0.5">{oficina.ciudad}</p>}
          </div>
        </div>
        <span className="text-white/50 text-xs">{ops.length} operación{ops.length !== 1 ? "es" : ""}</span>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops aprobadas</p>
            <p className="text-white text-3xl font-black">{opsAprobadas.length}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">de {ops.length} totales</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
            <p className="text-white text-2xl font-black leading-tight">{totalFinanciado > 0 ? fmtEur(String(totalFinanciado)) : "—"}</p>
          </div>
        </div>
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">En estudio</p>
            <p className="text-[#2E1A47] text-3xl font-black">{opsEstudio.length}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación pendiente</p>
            <p className="text-[#2E1A47] text-2xl font-black leading-tight">{totalPendiente > 0 ? fmtEur(String(totalPendiente)) : "—"}</p>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200"><h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos</h3></div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {([["Ciudad", oficina.ciudad], ["Dirección", oficina.direccion], ["Email", oficina.email], ["Teléfono", oficina.telefono]] as [string, string | null][]).map(([label, value]) =>
                value ? <div key={label} className="py-2.5"><span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold block">{label}</span><span className="text-sm text-gray-800 font-medium">{value}</span></div> : null
              )}
            </div>
          </div>

          {(oficina.persona_contacto || oficina.contacto_email || oficina.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200"><h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contacto principal</h3></div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {([["Nombre", oficina.persona_contacto], ["Email", oficina.contacto_email], ["Teléfono", oficina.contacto_telefono]] as [string, string | null][]).map(([label, value]) =>
                  value ? <div key={label} className="py-2.5"><span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold block">{label}</span><span className="text-sm text-gray-800 font-medium">{value}</span></div> : null
                )}
              </div>
            </div>
          )}

          <ContactosOficinaPanel contactos={contactos.map(c => ({ ...c, entityId, officeId: oficineId }))} officeId={oficineId} entityId={entityId} />
        </div>

        <div className="col-span-2">
          <NotesSection notes={notes} apiUrl={`/api/admin/entidades/oficinas/${oficineId}/notes`} currentUserId={userId} />
        </div>
      </div>
    </div>
  );
}
