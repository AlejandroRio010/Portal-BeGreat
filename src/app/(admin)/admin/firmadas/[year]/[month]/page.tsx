import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function AdminFirmadasMesPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params;
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
      comision_begreat: operations.comision_begreat,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(operations.created_at);

  const delMes = ops.filter(o => {
    if (!FIRMADAS.includes(o.fase ?? "")) return false;
    const d = new Date(o.created_at);
    return d.getFullYear() === y && d.getMonth() === m - 1;
  });

  const feeBegreat = delMes.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);
  const feeColab = delMes.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);
  const totalFinanciado = delMes.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-[#2E1A47]">← Volver al inicio</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones firmadas — {MESES[m - 1]} {y}</h1>
        <p className="text-sm text-gray-400 mt-1">{delMes.length} operación{delMes.length !== 1 ? "es" : ""} cerrada{delMes.length !== 1 ? "s" : ""} este mes</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Fee BeGreat del mes</p>
          <p className="text-2xl font-black text-white">{fmtEur(feeBegreat)}</p>
        </div>
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Fee colaboradores</p>
          <p className="text-2xl font-black text-white">{fmtEur(feeColab)}</p>
        </div>
        <div className="bg-[#EEEBF3] px-6 py-5">
          <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación cerrada</p>
          <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalFinanciado)}</p>
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
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee BeGreat</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee Colab.</th>
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
                  <td className="px-6 py-3.5 text-sm text-gray-600">{op.colaborador_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-700 font-medium whitespace-nowrap">{fmtEur(op.importe)}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.comision_begreat)}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtEur(op.comision_colaborador)}</td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
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
