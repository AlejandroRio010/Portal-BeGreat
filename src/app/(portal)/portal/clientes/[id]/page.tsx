import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations, collaborators, notes } from "@/db/schema";
import ClienteEditFormPortal from "./ClienteEditFormPortal";
import NuevoContactoForm from "./NuevoContactoForm";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ContactoPanel from "./ContactoPanel";
import { getCnaeByCode } from "@/lib/cnaes";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.collaborator_id, userId)))
    .limit(1);

  if (!client) notFound();

  // Check permissions
  const [colabPerms] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  const puedeEditar = colabPerms?.puede_editar_ops ?? false;

  // Colaborador que presentó el cliente
  const [colab] = await db
    .select({ nombre: collaborators.nombre, identificador: collaborators.identificador })
    .from(collaborators)
    .where(eq(collaborators.id, client.collaborator_id))
    .limit(1);

  const clientContacts = await db.select().from(contacts).where(eq(contacts.client_id, id));

  const clientOps = await db
    .select({
      id: operations.id,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      created_at: operations.created_at,
    })
    .from(operations)
    .where(and(eq(operations.client_id, id), eq(operations.collaborator_id, userId)))
    .orderBy(operations.created_at);

  // Notas de todas las operaciones del cliente
  const opIds = clientOps.map((o) => o.id);
  const clientNotes = opIds.length > 0
    ? await db
        .select()
        .from(notes)
        .where(inArray(notes.operation_id, opIds))
        .orderBy(notes.created_at)
    : [];

  const opTipoMap = Object.fromEntries(
    clientOps.map((o) => [o.id, o.pipeline_key === "consultoria" ? "Consultoría" : "Renting"])
  );

  const pendientesOps = clientOps.filter(
    (o) =>
      o.status === "pendiente_de_validar" ||
      (o.status === "activa" &&
        o.fase !== "Contrato firmado" &&
        o.fase !== "Honorarios pagados" &&
        o.fase !== "Transferencia realizada")
  );
  const firmadaOps = clientOps.filter(
    (o) => o.fase === "Contrato firmado" || o.fase === "Honorarios pagados" || o.fase === "Transferencia realizada"
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/portal/clientes" className="hover:text-[#2E1A47] transition-colors">
          Mis clientes
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{client.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2E1A47] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {client.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.nombre}</h1>
            {client.web && (
              <a
                href={client.web}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-[#2E1A47] transition-colors mt-0.5 block"
              >
                {client.web}
              </a>
            )}
          </div>
        </div>
        <Link
          href="/portal/alta-operacion"
          className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors"
        >
          + Nueva operación
        </Link>
      </div>

      {/* ── Grid: datos + operaciones ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Left: datos empresa + contactos */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
              Datos de la empresa
            </p>
            <dl className="space-y-3">
              {client.email && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Email</dt>
                  <dd>
                    <a href={`mailto:${client.email}`} className="text-sm text-gray-800 hover:text-[#2E1A47]">
                      {client.email}
                    </a>
                  </dd>
                </div>
              )}
              {client.telefono && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Teléfono</dt>
                  <dd className="text-sm text-gray-800">{client.telefono}</dd>
                </div>
              )}
              {client.cif && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">CIF</dt>
                  <dd className="text-sm text-gray-800">{client.cif}</dd>
                </div>
              )}
              {client.web && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Web</dt>
                  <dd>
                    <a
                      href={client.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-800 hover:text-[#2E1A47]"
                    >
                      {client.web}
                    </a>
                  </dd>
                </div>
              )}
              {client.linkedin && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">LinkedIn</dt>
                  <dd>
                    <a href={client.linkedin} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all">{client.linkedin}</a>
                  </dd>
                </div>
              )}
              {client.direccion && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Dirección</dt>
                  <dd className="text-sm text-gray-800">{client.direccion}</dd>
                </div>
              )}
              {client.cnae && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">CNAE</dt>
                  <dd className="text-sm text-gray-800">
                    {getCnaeByCode(client.cnae) ? `${client.cnae} — ${getCnaeByCode(client.cnae)!.titulo}` : client.cnae}
                  </dd>
                </div>
              )}
              {client.grupo_empresarial && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Grupo empresarial</dt>
                  <dd className="text-sm text-gray-800">{client.grupo_empresarial}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Alta en portal</dt>
                <dd className="text-sm text-gray-800">{fmt(client.created_at)}</dd>
              </div>
              {/* Colaborador propietario */}
              <div className="pt-3 mt-1 border-t border-gray-100">
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-1">Presentado por</dt>
                <dd className="text-sm font-semibold text-[#2E1A47]">{colab?.nombre ?? "—"}</dd>
                {colab?.identificador && (
                  <dd className="text-xs text-gray-400 mt-0.5">{colab.identificador}</dd>
                )}
              </div>
            </dl>
            {puedeEditar && (
              <ClienteEditFormPortal client={{
                id: client.id, nombre: client.nombre,
                cif: client.cif ?? null, email: client.email ?? null,
                telefono: client.telefono ?? null, web: client.web ?? null,
                linkedin: client.linkedin ?? null,
                nombre_comercial: client.nombre_comercial ?? null,
                direccion: client.direccion ?? null,
                cnae: client.cnae ?? null,
                grupo_empresarial: client.grupo_empresarial ?? null,
              }} />
            )}
          </div>

          {/* Contactos */}
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
              Personas de contacto
            </p>
            {clientContacts.length === 0 ? (
              <p className="text-xs text-gray-300">Sin personas de contacto registradas.</p>
            ) : (

              <div className="space-y-4">
                {clientContacts.map((c) => (
                  <div key={c.id} className="border-l-2 border-[#EEEBF3] pl-3">
                    <ContactoPanel contact={c} />
                    {c.rol && <p className="text-xs text-[#2E1A47] font-medium mt-0.5">{c.rol}</p>}
                    {c.email && <p className="text-xs text-gray-400 mt-1 truncate">{c.email}</p>}
                    {c.telefono && <p className="text-xs text-gray-400 mt-0.5">{c.telefono}</p>}
                  </div>
                ))}
              </div>
            )}
            {puedeEditar && <NuevoContactoForm clientId={client.id} />}
          </div>
        </div>

        {/* Right: operaciones */}
        <div className="col-span-2 bg-white border border-gray-200 p-5">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
            Operaciones ({clientOps.length})
          </p>
          {clientOps.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Sin operaciones para este cliente.</p>
              <Link
                href="/portal/alta-operacion"
                className="block mt-2 text-xs font-semibold text-[#2E1A47] hover:underline"
              >
                + Dar de alta operación
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo / Producto</th>
                    <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                    <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Importe</th>
                    <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fee</th>
                    <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Alta</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientOps.map((op) => (
                    <tr key={op.id} className="hover:bg-[#EEEBF3]/20 transition-colors group">
                      <td className="py-3.5">
                        <p className="text-sm font-medium text-gray-900">
                          {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                        </p>
                        {op.producto && <p className="text-xs text-gray-400">{op.producto}</p>}
                      </td>
                      <td className="py-3.5">
                        {op.status === "pendiente_de_validar" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendiente
                          </span>
                        ) : op.fase === "Contrato firmado" ||
                          op.fase === "Honorarios pagados" ||
                          op.fase === "Transferencia realizada" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                            Firmada ✓
                          </span>
                        ) : op.status === "archivada" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                            Denegada
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                            {op.fase}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-sm text-gray-600">
                        {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
                      </td>
                      <td className="py-3.5">
                        {op.comision_colaborador ? (
                          <span className="text-sm font-bold text-[#2E1A47]">
                            {Number(op.comision_colaborador).toLocaleString("es-ES")} €
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-sm text-gray-400">{fmt(op.created_at)}</td>
                      <td className="py-3.5">
                        <Link
                          href={`/portal/operaciones/${op.id}`}
                          className="text-[#2E1A47] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Resumen */}
              <div className="flex gap-6 mt-5 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">En estudio</p>
                  <p className="text-xl font-black text-[#2E1A47]">{pendientesOps.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Firmadas</p>
                  <p className="text-xl font-black text-emerald-600">{firmadaOps.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
                  <p className="text-xl font-black text-gray-700">{clientOps.length}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Notas e historial ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 p-5">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
          Notas e historial{clientNotes.length > 0 ? ` (${clientNotes.length})` : ""}
        </p>
        {clientNotes.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Sin notas todavía para este cliente.</p>
            <p className="text-xs text-gray-300 mt-1">Las notas se añaden desde el detalle de cada operación.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {clientNotes.map((n) => (
              <div key={n.id} className="border-l-2 border-[#2E1A47] pl-4 py-2 bg-[#EEEBF3]/25">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-[#2E1A47]">{n.author_name}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {opTipoMap[n.operation_id] && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] font-semibold px-1.5 py-0.5">
                        {opTipoMap[n.operation_id]}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700">{n.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
