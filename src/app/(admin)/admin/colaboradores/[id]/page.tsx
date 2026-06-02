import { db } from "@/db";
import { collaborators, operations, clients, collaboratorContacts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NotasForm from "./NotasForm";

const FASES_FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pendiente_de_validar: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   label: "Pendiente" },
  activa:               { bg: "bg-gray-100",    text: "text-gray-600",    border: "border-gray-200",    label: "En curso" },
  archivada:            { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     label: "Archivada" },
};

function fmtEur(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(val));
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export default async function FichaColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [colab] = await db
    .select()
    .from(collaborators)
    .where(and(eq(collaborators.id, id), eq(collaborators.role, "colaborador")))
    .limit(1);

  if (!colab) notFound();

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      entidad_financiera: operations.entidad_financiera,
      created_at: operations.created_at,
      client_id: operations.client_id,
    })
    .from(operations)
    .where(eq(operations.collaborator_id, id))
    .orderBy(operations.created_at);

  const colabClients = await db
    .select()
    .from(clients)
    .where(eq(clients.collaborator_id, id))
    .orderBy(clients.nombre);

  const contacts = await db
    .select()
    .from(collaboratorContacts)
    .where(eq(collaboratorContacts.collaborator_id, id))
    .orderBy(collaboratorContacts.nombre);

  // KPIs
  const totalOps = ops.length;
  const firmadas = ops.filter((o) => FASES_FIRMADAS.includes(o.fase));
  const opsFirmadas = firmadas.length;
  const feeGenerada = firmadas.reduce((acc, o) => acc + Number(o.comision_colaborador ?? 0), 0);
  const feePendiente = ops
    .filter((o) => !FASES_FIRMADAS.includes(o.fase))
    .reduce((acc, o) => acc + Number(o.comision_colaborador ?? 0), 0);

  // Client ops count map
  const clientOpsCount: Record<string, number> = {};
  for (const o of ops) {
    if (o.client_id) clientOpsCount[o.client_id] = (clientOpsCount[o.client_id] ?? 0) + 1;
  }

  const inicial = colab.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/colaboradores" className="hover:text-[#2E1A47] font-medium">Colaboradores</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{colab.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        {/* Logo / Avatar */}
        <div className="flex items-center gap-5">
          {colab.logo_url ? (
            <img src={colab.logo_url} alt={colab.nombre} className="h-16 w-16 object-contain bg-white p-1" />
          ) : (
            <div className="h-16 w-16 bg-white/20 flex items-center justify-center text-white text-3xl font-bold select-none">
              {inicial}
            </div>
          )}
        </div>

        {/* Right: name + id + badge */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-white text-xl font-bold">{colab.nombre}</span>
          <span className="text-white/60 text-xs font-mono">{colab.identificador}</span>
          <span className={`inline-block px-2 py-0.5 text-xs font-semibold border ${colab.activo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
            {colab.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        {/* Dark pair */}
        <div className="bg-[#2E1A47] flex">
          <div className="flex-1 px-6 py-5">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Ops totales</p>
            <p className="text-white text-3xl font-bold">{totalOps}</p>
          </div>
          <div className="w-px bg-white/20 my-4" />
          <div className="flex-1 px-6 py-5">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Ops firmadas</p>
            <p className="text-white text-3xl font-bold">{opsFirmadas}</p>
          </div>
        </div>
        {/* Light pair */}
        <div className="bg-[#EEEBF3] flex">
          <div className="flex-1 px-6 py-5">
            <p className="text-[#2E1A47]/60 text-xs uppercase tracking-wider mb-1">Fee generada</p>
            <p className="text-[#2E1A47] text-3xl font-bold">{fmtEur(String(feeGenerada))}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25 my-4" />
          <div className="flex-1 px-6 py-5">
            <p className="text-[#2E1A47]/60 text-xs uppercase tracking-wider mb-1">Fee pendiente</p>
            <p className="text-[#2E1A47] text-3xl font-bold">{fmtEur(String(feePendiente))}</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: datos empresa + contactos */}
        <div className="flex flex-col gap-4">
          {/* Datos empresa */}
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["Nombre", colab.nombre],
                ["Razón social", colab.razon_social],
                ["CIF", colab.cif],
                ["Email", colab.email],
                ["Teléfono", colab.telefono],
                ["Web", colab.web],
                ["Nº trabajadores", colab.num_trabajadores?.toString()],
                ["Alta", fmtDate(colab.created_at)],
              ].map(([label, value]) => (
                value ? (
                  <div key={label} className="py-2 flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                    <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Personas de contacto */}
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Personas de contacto</h3>
            </div>
            {contacts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Sin contactos registrados</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {contacts.map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                    {c.rol && <p className="text-xs text-gray-400">{c.rol}</p>}
                    {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                    {c.telefono && <p className="text-xs text-gray-500">{c.telefono}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 2-3: Operaciones */}
        <div className="col-span-2 bg-white border border-gray-200">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones</h3>
          </div>
          {ops.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Sin operaciones</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Entidad</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map((op) => {
                  const badge = STATUS_BADGE[op.status] ?? STATUS_BADGE.activa;
                  return (
                    <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium max-w-[180px] truncate">{op.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 capitalize">{op.pipeline_key}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{op.entidad_financiera ?? "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-700 font-medium">{fmtEur(op.comision_colaborador)}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(op.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Clientes */}
      <div className="mx-8 mb-6 bg-white border border-gray-200">
        <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Clientes</h3>
        </div>
        {colabClients.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">Sin clientes registrados</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre empresa</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nº ops</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {colabClients.map((cl) => (
                <tr key={cl.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">{cl.nombre}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{cl.email ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{cl.telefono ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{clientOpsCount[cl.id] ?? 0}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(cl.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notas internas */}
      <div className="mx-8 mb-10 bg-white border border-gray-200">
        <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Notas internas</h3>
        </div>
        <div className="p-5">
          <NotasForm colaboradorId={colab.id} initialNotas={colab.notas_internas ?? null} />
        </div>
      </div>
    </div>
  );
}
