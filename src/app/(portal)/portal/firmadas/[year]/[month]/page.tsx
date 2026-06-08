import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtEur } from "@/lib/format";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function FirmadasMesPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  const y = parseInt(year);
  const m = parseInt(month); // 1-12

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      entidad_financiera: operations.entidad_financiera,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.collaborator_id, userId))
    .orderBy(operations.created_at);

  const delMes = ops.filter(o => {
    if (!FIRMADAS.includes(o.fase ?? "")) return false;
    const d = new Date(o.created_at);
    return d.getFullYear() === y && d.getMonth() === m - 1;
  });

  const totalComision = delMes.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);
  const totalFinanciado = delMes.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/portal" className="text-xs text-gray-400 hover:text-[#2E1A47]">← Volver al inicio</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones firmadas — {MESES[m - 1]} {y}</h1>
        <p className="text-sm text-gray-400 mt-1">{delMes.length} operación{delMes.length !== 1 ? "es" : ""} cerrada{delMes.length !== 1 ? "s" : ""} este mes</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Tus comisiones del mes</p>
          <p className="text-2xl font-black text-white">{totalComision > 0 ? fmtEur(totalComision) : "—"}</p>
        </div>
        <div className="bg-[#EEEBF3] px-6 py-5">
          <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación cerrada</p>
          <p className="text-2xl font-black text-[#2E1A47]">{totalFinanciado > 0 ? fmtEur(totalFinanciado) : "—"}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200">
        {delMes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No firmaste operaciones en {MESES[m - 1]} de {y}.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operación</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tu comisión</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {delMes.map(op => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600 max-w-[180px] truncate">{op.nombre ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">{op.importe ? fmtEur(Number(op.importe)) : "—"}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-[#2E1A47]">{op.comision_colaborador ? fmtEur(Number(op.comision_colaborador)) : "—"}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/portal/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
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
