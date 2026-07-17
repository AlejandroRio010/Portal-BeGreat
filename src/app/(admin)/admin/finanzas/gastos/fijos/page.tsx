import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGastos, type HoldedGasto, CATEGORIAS_GASTO } from "@/lib/holded";
import { getGastosFijos, esDelFijo, norm, importeFijoMes, conIva } from "@/lib/gastosFijos";
import { fmtEur } from "@/lib/format";
import { AddGastoFijoButton, RemoveGastoFijoButton, ObliviateFijoCell, ImporteBaseFijoEdit, type CandidatoProveedor } from "../GastosFijosManage";

export const dynamic = "force-dynamic";

const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const holdedUrl = (id: string) => `https://app.holded.com/expenses/list#open:purchase-${id}`;

export default async function GastosFijosPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const mesActualIdx = hoy.getMonth();

  let gastos: HoldedGasto[] = [];
  let holdedError: string | null = null;
  try { gastos = await getGastos({ incluirBorradores: true }); } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  const delAnyo = gastos.filter(g => g.date.startsWith(String(anyo)));
  const allFijos = await getGastosFijos();
  const fijosDef = allFijos.filter(f => f.empresa === "bearing");        // cruzan con Holded
  const fijosObliviate = allFijos.filter(f => f.empresa === "obliviate"); // manuales

  const filas = fijosDef.map(gf => {
    const meses = CORTOS.map((_, m) => {
      const ym = `${anyo}-${String(m + 1).padStart(2, "0")}`;
      const facts = delAnyo.filter(g => g.date.startsWith(ym) && esDelFijo(gf, g.proveedor, g.contact_id));
      const total = facts.reduce((s, g) => s + g.total, 0);
      const hay = facts.length > 0;
      const pagadas = hay && facts.every(g => g.estado === "pagada");
      let estado: "pagado" | "sin_pagar" | "falta" | "futuro";
      if (pagadas) estado = "pagado";
      else if (hay) estado = "sin_pagar";
      else if (m < mesActualIdx) estado = "falta";
      else estado = "futuro";
      return { m, estado, total, n: facts.length, id: facts[0]?.id ?? null };
    });
    return { gf, meses };
  });

  // Obliviate se guarda sin IVA; para el coste "de caja" lo sumamos con IVA (como Bearing)
  const obliviateMensual = fijosObliviate.filter(f => f.periodicidad === "mensual").reduce((s, g) => s + conIva(g.mensual ?? 0), 0);
  const obliviateAnual = fijosObliviate.filter(f => f.periodicidad === "anual").reduce((s, g) => s + conIva(g.mensual ?? 0), 0);
  const totalMensual = fijosDef.reduce((s, g) => s + (g.mensual ?? 0), 0) + obliviateMensual;

  // Filas de Obliviate (manuales): cada mes con su estado + importe y si aplica
  const filasObliviate = fijosObliviate.map(gf => {
    const meses = CORTOS.map((_, m) => {
      const aplica = gf.periodicidad === "mensual" || gf.mes_cobro === m + 1;
      const ym = `${anyo}-${m + 1}`;
      const cell = gf.estado_manual?.[ym];
      const override = typeof cell === "object" && cell ? cell.i : undefined;
      const importe = override ?? importeFijoMes(gf, m);
      // Sin marca explícita: se asume pagado si el mes ya pasó o es el actual
      const estadoDefault = m <= mesActualIdx ? "pagada" : "pendiente";
      const estado = (typeof cell === "string" ? cell : cell?.e) ?? estadoDefault;
      return { m, aplica, ym, estado, importe, esPasado: m < mesActualIdx };
    });
    return { gf, meses };
  });

  // Candidatos para "añadir gasto fijo": proveedores vistos (dedup), última factura
  const esFijo = (g: HoldedGasto) => fijosDef.some(f => esDelFijo(f, g.proveedor, g.contact_id));
  const candMap = new Map<string, CandidatoProveedor>();
  for (const g of gastos) {
    const key = g.contact_id ?? norm(g.proveedor);
    const prev = candMap.get(key);
    if (!prev) candMap.set(key, { proveedor: g.proveedor, contactId: g.contact_id, categoria: g.categoria, importe: g.total, fecha: g.date, n: 1, yaFijo: esFijo(g) });
    else { prev.n++; if (g.date > prev.fecha) { prev.fecha = g.date; prev.importe = g.total; prev.categoria = g.categoria; } }
  }
  const candidatos = [...candMap.values()];
  const COLOR: Record<string, string> = {
    pagado: "bg-emerald-500 text-white hover:bg-emerald-600",
    sin_pagar: "bg-amber-400 text-white hover:bg-amber-500",
    falta: "bg-red-500 text-white",
    futuro: "bg-gray-100 text-gray-300",
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span>
            <Link href="/admin/finanzas/gastos" className="hover:text-[#2E1A47]">Gastos</Link><span>/</span>
            <span className="text-gray-600 font-medium">Fijos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos fijos {anyo}</h1>
          <p className="text-sm text-gray-400 mt-1">
            <b className="text-[#2E1A47]">Bearing</b> cruza automáticamente con Holded (clic en un mes = abrir la factura). <b className="text-amber-700">Obliviate</b> (abajo) se marca a mano: clic para factura recibida / pagada. Verde = recibida y pagada · ámbar = recibida sin pagar · rojo = mes pasado sin pagar.
          </p>
        </div>
        <div className="self-center shrink-0">
          <AddGastoFijoButton candidatos={candidatos} categorias={CATEGORIAS_GASTO} />
        </div>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Proveedores fijos</p>
              <p className="text-3xl font-black text-white">{allFijos.length}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">{fijosDef.length} Bearing · {fijosObliviate.length} Obliviate</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Coste fijo mensual (los de importe fijo)</p>
              <p className="text-2xl font-black text-white">{fmtEur(totalMensual)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">Los de importe variable no suman aquí</p>
            </div>
            <div className="bg-[#EEEBF3] px-6 py-5">
              <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Anualizado (fijos)</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalMensual * 12 + obliviateAnual)}</p>
            </div>
          </div>

          <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Bearing · cruzado con Holded</h2>
          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EEEBF3] border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Gasto fijo</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">€/mes</th>
                    {CORTOS.map((m, i) => (
                      <th key={m} className={`text-center px-1.5 py-3 text-[10px] font-bold uppercase ${i === mesActualIdx ? "text-[#2E1A47]" : "text-gray-400"}`}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filas.map(({ gf, meses }) => (
                    <tr key={gf.id} className="group hover:bg-[#EEEBF3]/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{gf.label}</p>
                            <p className="text-[10px] text-gray-400">{gf.categoria}{gf.nota ? ` · ${gf.nota}` : ""}</p>
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <RemoveGastoFijoButton id={gf.id} label={gf.label} />
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-[#2E1A47] whitespace-nowrap">{gf.mensual != null ? fmtEur(gf.mensual) : "variable"}</td>
                      {meses.map(({ m, estado, total, n, id }) => {
                        const cell = (
                          <div className={`relative mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold ${COLOR[estado]}`}
                            title={n > 0 ? `${fmtEur(total)} · ${n} factura${n !== 1 ? "s" : ""} · ${estado === "pagado" ? "pagada" : "sin pagar"} · abrir en Holded` : estado === "falta" ? "sin factura (mes pasado)" : "aún no"}>
                            {estado === "pagado" ? "✓" : estado === "sin_pagar" ? "€" : estado === "falta" ? "✕" : ""}
                            {n > 1 && <span className="absolute -top-1 -right-1 bg-[#2E1A47] text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center">{n}</span>}
                          </div>
                        );
                        return (
                          <td key={m} className="px-1 py-2 text-center">
                            {id ? <a href={holdedUrl(id)} target="_blank" rel="noopener noreferrer" className="block">{cell}</a> : cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-4 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Recibida y pagada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Recibida sin pagar</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Mes pasado sin factura/pago</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Aún no toca</span>
            <span className="text-gray-400">· el número en la esquina = varias facturas ese mes</span>
          </div>

          {fijosObliviate.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">🏢 Obliviate · manual (fuera de Holded)</h2>
              <div className="bg-white border border-amber-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-amber-50 border-b border-amber-100">
                        <th className="text-left px-4 py-3 text-xs font-bold text-amber-800 uppercase tracking-wider">Gasto fijo</th>
                        <th className="text-right px-3 py-3 text-xs font-bold text-amber-800 uppercase tracking-wider">€/mes · sin IVA</th>
                        {CORTOS.map((m, i) => (
                          <th key={m} className={`text-center px-1.5 py-3 text-[10px] font-bold uppercase ${i === mesActualIdx ? "text-amber-800" : "text-gray-400"}`}>{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filasObliviate.map(({ gf, meses }) => (
                        <tr key={gf.id} className="group hover:bg-amber-50/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{gf.label}</p>
                                <p className="text-[10px] text-gray-400">{gf.categoria}{gf.nota ? ` · ${gf.nota}` : ""}</p>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <RemoveGastoFijoButton id={gf.id} label={gf.label} />
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <ImporteBaseFijoEdit id={gf.id} mensual={gf.mensual} periodicidad={gf.periodicidad} />
                          </td>
                          {meses.map(({ m, ym, estado, importe, aplica, esPasado }) => (
                            <td key={m} className="px-1 py-2 text-center">
                              <ObliviateFijoCell id={gf.id} ym={ym} estado={estado} importe={importe} aplica={aplica} esPasado={esPasado} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3">Importes <b>sin IVA</b> (el 21% se calcula por detrás para caja e impuestos). Clic en un mes → desplegable para elegir <b>sin marcar</b> · <span className="text-amber-600 font-semibold">factura recibida</span> · <span className="text-emerald-600 font-semibold">pagada</span>, y ajustar el importe de ese mes. Los dominios (anuales) solo en su mes de renovación.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
