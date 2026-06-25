import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function ProveedorFirmadasMesPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params;
  const y = parseInt(year);
  const m = parseInt(month);

  const session = await auth();
  if (!session) return null;
  const supplierId = (session.user as any).supplierId as string;
  if (!supplierId) return null;

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      importe: operations.importe,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.supplier_id, supplierId))
    .orderBy(operations.created_at);

  const delMes = ops.filter(o => {
    if (!FIRMADAS.includes(o.fase ?? "")) return false;
    const d = new Date(o.created_at);
    return d.getFullYear() === y && d.getMonth() === m - 1;
  });

  const totalImporte = delMes.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div>
      <div className="mb-2">
        <Link href="/proveedor" className="text-xs text-gray-400 hover:text-[#2E1A47]">← Volver al inicio</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones firmadas — {MESES[m - 1]} {y}</h1>
        <p className="text-sm text-gray-400 mt-1">{delMes.length} operación{delMes.length !== 1 ? "es" : ""} cerrada{delMes.length !== 1 ? "s" : ""} este mes</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Operaciones firmadas</p>
          <p className="text-3xl font-black text-white">{delMes.length}</p>
        </div>
        <div className="bg-[#EEEBF3] px-6 py-5">
          <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Importe vendido</p>
          <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalImporte)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200">
        {delMes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No se firmaron operaciones en {MESES[m - 1]} de {y}.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente / Operación</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {delMes.map(op => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">{op.nombre ?? op.client_nombre ?? "—"}</p>
                    {op.client_nombre && <p className="text-xs text-gray-400">{op.client_nombre}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.importe)}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">
                    {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/proveedor/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Ver →</Link>
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
