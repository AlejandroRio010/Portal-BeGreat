import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGastos, type HoldedGasto } from "@/lib/holded";
import { getGastosFijos, esDelFijo, importeFijoMes, construirCandidatos } from "@/lib/gastosFijos";
import { getCategoriasGasto } from "@/lib/categorias";
import { fmtEur } from "@/lib/format";
import {
  AddGastoFijoButton, RemoveGastoFijoButton, ObliviateFijoCell, ImporteBaseFijoEdit,
  FijoInfoEdit, BearingMesCell, type BearingMes,
} from "../GastosFijosManage";

export const dynamic = "force-dynamic";

const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Un mes se considera "de más" si supera lo estipulado en > max(1€, 3%).
function esSobrecoste(base: number, estipulado: number | null): boolean {
  if (estipulado == null || estipulado <= 0) return false;
  return base - estipulado > Math.max(1, estipulado * 0.03);
}
function notaDeMes(cell: any): string | null {
  if (cell && typeof cell === "object" && typeof cell.nota === "string") return cell.nota;
  return null;
}

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
  const categoriasGasto = await getCategoriasGasto();
  const fijosDef = allFijos.filter(f => f.empresa === "bearing");        // cruzan con Holded
  const fijosObliviate = allFijos.filter(f => f.empresa === "obliviate"); // manuales

  // ── Bearing: mes a mes desde las compras de Holded (base sin IVA) ──
  // Casa por contacto exacto (contact_id) → coge todas las facturas del proveedor.
  const filasBearing = fijosDef.map(gf => {
    const meses: BearingMes[] = CORTOS.map((_, m) => {
      const pref = `${anyo}-${String(m + 1).padStart(2, "0")}`;   // para casar la fecha
      const ymKey = `${anyo}-${m + 1}`;                            // clave de la nota (sin padding)
      const facts = delAnyo.filter(g => g.date.startsWith(pref) && esDelFijo(gf, g.proveedor, g.contact_id, g.cuenta_id));
      const base = facts.reduce((s, g) => s + g.subtotal, 0);
      const hay = facts.length > 0;
      const pagadas = hay && facts.every(g => g.estado === "pagada");
      let estado: BearingMes["estado"];
      if (pagadas) estado = "pagado";
      else if (hay) estado = "sin_pagar";
      else if (m < mesActualIdx) estado = "falta";
      else estado = "futuro";
      const over = hay && esSobrecoste(base, gf.mensual);
      return {
        ym: ymKey, estado, base, n: facts.length, holdedId: facts[0]?.id ?? null,
        overcharge: over, exceso: over ? base - (gf.mensual ?? 0) : 0,
        nota: notaDeMes(gf.estado_manual?.[ymKey]),
      };
    });
    const avisos = meses.filter(m => m.overcharge);
    return { gf, meses, avisos };
  });

  // ── Obliviate: mes a mes manual ──
  const filasObliviate = fijosObliviate.map(gf => {
    const meses = CORTOS.map((_, m) => {
      const aplica = gf.periodicidad === "mensual" || gf.mes_cobro === m + 1;
      const ym = `${anyo}-${m + 1}`;
      const cell = gf.estado_manual?.[ym];
      const override = typeof cell === "object" && cell ? cell.i : undefined;
      const importe = override ?? importeFijoMes(gf, m);
      const estadoDefault = m <= mesActualIdx ? "pagada" : "pendiente";
      const estado = (typeof cell === "string" ? cell : cell?.e) ?? estadoDefault;
      return { m, aplica, ym, estado, importe, esPasado: m < mesActualIdx };
    });
    return { gf, meses };
  });

  // ── KPIs (todo base, sin IVA) ──
  const mensualBearing = fijosDef.filter(f => f.periodicidad === "mensual").reduce((s, g) => s + (g.mensual ?? 0), 0);
  const mensualObliviate = fijosObliviate.filter(f => f.periodicidad === "mensual").reduce((s, g) => s + (g.mensual ?? 0), 0);
  const anualExtra = allFijos.filter(f => f.periodicidad === "anual").reduce((s, g) => s + (g.mensual ?? 0), 0);
  const totalMensualBase = mensualBearing + mensualObliviate;
  const anualizadoBase = totalMensualBase * 12 + anualExtra;
  const totalAvisos = filasBearing.reduce((s, f) => s + f.avisos.length, 0);

  // ── Candidatos para "añadir gasto fijo" de Bearing (con desglose por cuenta) ──
  const candidatos = construirCandidatos(gastos, fijosDef);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span>
          <Link href="/admin/finanzas/gastos" className="hover:text-[#2E1A47]">Gastos</Link><span>/</span>
          <span className="text-gray-600 font-medium">Fijos</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gastos fijos {anyo}</h1>
          <Link href="/admin/finanzas/categorias" className="text-xs font-semibold text-[#2E1A47] bg-[#EEEBF3] hover:bg-[#e2ddec] rounded-xl px-3 py-1.5 transition-colors whitespace-nowrap">🏷️ Categorías</Link>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          <b className="text-[#2E1A47]">Bearing</b> cruza con las facturas de Holded por proveedor: al llegar → <span className="text-amber-600 font-semibold">recibida</span>, al conciliarse el pago → <span className="text-emerald-600 font-semibold">pagada</span>. <b className="text-amber-700">Obliviate</b> se marca a mano. Importes <b>sin IVA</b> (se muestra "+ IVA"); el <span className="text-red-600 font-semibold">⚠️</span> de un mes avisa de sobrecoste.
        </p>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#2E1A47] px-5 py-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Proveedores fijos</p>
              <p className="text-2xl font-black text-white">{allFijos.length}</p>
              <p className="text-white/40 text-[9px] mt-0.5 uppercase tracking-wide">{fijosDef.length} Bearing · {fijosObliviate.length} Obliviate</p>
            </div>
            <div className="bg-[#2E1A47] px-5 py-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Coste fijo mensual</p>
              <p className="text-2xl font-black text-white">{fmtEur(totalMensualBase)}</p>
              <p className="text-white/40 text-[9px] mt-0.5 uppercase tracking-wide">base · sin IVA</p>
            </div>
            <div className="bg-[#EEEBF3] px-5 py-4">
              <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1">Anualizado</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(anualizadoBase)}</p>
              <p className="text-[#2E1A47]/40 text-[9px] mt-0.5 uppercase tracking-wide">base · sin IVA</p>
            </div>
            <div className={`px-5 py-4 ${totalAvisos > 0 ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${totalAvisos > 0 ? "text-red-500" : "text-gray-400"}`}>Avisos de sobrecoste</p>
              <p className={`text-2xl font-black ${totalAvisos > 0 ? "text-red-600" : "text-gray-300"}`}>{totalAvisos > 0 ? `⚠️ ${totalAvisos}` : "0"}</p>
              <p className="text-gray-400 text-[9px] mt-0.5 uppercase tracking-wide">meses por encima</p>
            </div>
          </div>

          {/* Dos secciones lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── BEARING ── */}
            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#EEEBF3] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Bearing</h2>
                  <p className="text-[10px] text-[#2E1A47]/50">cruzado con Holded · {fijosDef.length} fijos</p>
                </div>
                <AddGastoFijoButton empresa="bearing" candidatos={candidatos} categorias={categoriasGasto} />
              </div>
              <div className="divide-y divide-gray-50">
                {filasBearing.length === 0 && <p className="px-4 py-8 text-center text-xs text-gray-300">Sin gastos fijos. Añade uno con ＋</p>}
                {filasBearing.map(({ gf, meses, avisos }) => (
                  <div key={gf.id} className="group px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <FijoInfoEdit id={gf.id} label={gf.label} nota={gf.nota} categoria={gf.categoria} tono="bearing" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ImporteBaseFijoEdit id={gf.id} mensual={gf.mensual} periodicidad={gf.periodicidad} tono="bearing" />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity"><RemoveGastoFijoButton id={gf.id} label={gf.label} /></span>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      {meses.map((cell, i) => (
                        <div key={i} className="flex justify-center">
                          <BearingMesCell id={gf.id} mes={cell} estipulado={gf.mensual} />
                        </div>
                      ))}
                    </div>
                    {avisos.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {avisos.map(a => {
                          const mi = Number(a.ym.split("-")[1]) - 1;
                          return (
                            <p key={a.ym} className="text-[10px] text-red-600 flex items-start gap-1">
                              <span>⚠️</span>
                              <span><b>{CORTOS[mi]}</b> +{fmtEur(a.exceso)} de lo estipulado{a.nota ? <span className="text-gray-500"> · {a.nota}</span> : <span className="text-gray-300"> · clic para explicar</span>}</span>
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── OBLIVIATE ── */}
            <section className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">🏢 Obliviate</h2>
                  <p className="text-[10px] text-amber-800/50">manual · fuera de Holded · {fijosObliviate.length} fijos</p>
                </div>
                <AddGastoFijoButton empresa="obliviate" categorias={categoriasGasto} />
              </div>
              <div className="divide-y divide-gray-50">
                {filasObliviate.length === 0 && <p className="px-4 py-8 text-center text-xs text-gray-300">Sin gastos fijos. Añade uno con ＋</p>}
                {filasObliviate.map(({ gf, meses }) => (
                  <div key={gf.id} className="group px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1"><FijoInfoEdit id={gf.id} label={gf.label} nota={gf.nota} categoria={gf.categoria} tono="obliviate" /></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ImporteBaseFijoEdit id={gf.id} mensual={gf.mensual} periodicidad={gf.periodicidad} tono="obliviate" />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity"><RemoveGastoFijoButton id={gf.id} label={gf.label} /></span>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      {meses.map((cell, i) => (
                        <div key={i} className="flex justify-center">
                          <ObliviateFijoCell id={gf.id} ym={cell.ym} estado={cell.estado} importe={cell.importe} aplica={cell.aplica} esPasado={cell.esPasado} compact />
                        </div>
                      ))}
                    </div>
                    {gf.periodicidad === "anual" && (
                      <p className="mt-1.5 text-[10px] text-amber-700/70">Anual · solo cuenta en {CORTOS[(gf.mes_cobro ?? 1) - 1]}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-5 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Recibida y pagada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Recibida sin pagar</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Mes pasado sin factura/pago</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Aún no toca</span>
            <span className="flex items-center gap-1.5"><span className="text-red-500">⚠️</span> Cobrado de más</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            En <b>Obliviate</b>, clic en un mes → desplegable para <b>sin marcar</b> · <span className="text-amber-600 font-semibold">recibida</span> · <span className="text-emerald-600 font-semibold">pagada</span> y ajustar el importe. Clic en el nombre para renombrar o poner concepto.
          </p>
        </>
      )}
    </div>
  );
}
