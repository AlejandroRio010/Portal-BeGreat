import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

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

  const clientContacts = await db.select().from(contacts).where(eq(contacts.client_id, id));

  const clientOps = await db
    .select({ id: operations.id, pipeline_key: operations.pipeline_key, producto: operations.producto, fase: operations.fase, status: operations.status, importe: operations.importe, created_at: operations.created_at })
    .from(operations)
    .where(and(eq(operations.client_id, id), eq(operations.collaborator_id, userId)))
    .orderBy(operations.created_at);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/portal/clientes" className="hover:text-[#2E1A47] transition-colors">Mis clientes</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{client.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2E1A47] flex items-center justify-center text-white text-lg font-bold">
            {client.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.nombre}</h1>
            {client.web && (
              <a href={client.web} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-[#2E1A47] transition-colors mt-0.5 block">
                {client.web}
              </a>
            )}
          </div>
        </div>
        <Link href="/portal/alta-operacion" className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
          + Nueva operación
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Left: datos de empresa */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos de la empresa</p>
            <dl className="space-y-3">
              {client.email && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Email</dt>
                  <dd><a href={`mailto:${client.email}`} className="text-sm text-gray-800 hover:text-[#2E1A47]">{client.email}</a></dd>
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
                  <dd><a href={client.web} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-800 hover:text-[#2E1A47]">{client.web}</a></dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Registrado</dt>
                <dd className="text-sm text-gray-800">{fmt(client.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Contacts */}
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
                    <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                    {c.rol && <p className="text-xs text-[#2E1A47] font-medium mt-0.5">{c.rol}</p>}
                    {c.email && <a href={`mailto:${c.email}`} className="block text-xs text-gray-400 hover:text-[#2E1A47] mt-1 transition-colors truncate">{c.email}</a>}
                    {c.telefono && <p className="text-xs text-gray-400 mt-0.5">{c.telefono}</p>}
                  </div>
                ))}
              </div>
            )}
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
              <Link href="/portal/alta-operacion" className="block mt-2 text-xs font-semibold text-[#2E1A47] hover:underline">
                + Dar de alta operación
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo / Producto</th>
                  <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fase</th>
                  <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Importe</th>
                  <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Alta</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientOps.map((op) => (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/20 transition-colors group">
                    <td className="py-3.5">
                      <p className="text-sm font-medium text-gray-900">{op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}</p>
                      {op.producto && <p className="text-xs text-gray-400">{op.producto}</p>}
                    </td>
                    <td className="py-3.5">
                      {op.status === "pendiente_de_validar" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pendiente
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">{op.fase}</span>
                      )}
                    </td>
                    <td className="py-3.5 text-sm text-gray-600">
                      {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
                    </td>
                    <td className="py-3.5 text-sm text-gray-400">{fmt(op.created_at)}</td>
                    <td className="py-3.5">
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
    </div>
  );
}
