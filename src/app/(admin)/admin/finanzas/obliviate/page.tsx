import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { obliviateMovs, finanzasValores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CATEGORIAS_OBLIVIATE, type CategoriaObliviate } from "@/lib/obliviate";
import { fmtEur } from "@/lib/format";
import ExtractoUpload from "./ExtractoUpload";
import CategoriaSelect from "./CategoriaSelect";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function ObliviatePage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const anyo = new Date().getFullYear();
  const [movs, valores] = await Promise.all([
    db.select().from(obliviateMovs).orderBy(desc(obliviateMovs.fecha), desc(obliviateMovs.created_at)),
    db.select().from(finanzasValores).where(eq(finanzasValores.clave, `saldo_inicial_obliviate_${anyo}`)),
  ]);
  const saldoInicial = valores[0] ? Number(valores[0].valor) : null;
  const delAnyo = movs.filter(m => m.fecha.startsWith(String(anyo)));
  const flujo = delAnyo.reduce((s, m) => s + Number(m.importe), 0);
  const saldoActual = saldoInicial != null ? saldoInicial + flujo : null;

  // Totales por categoría del año
  const porCat = new Map<CategoriaObliviate, number>();
  for (const m of delAnyo) {
    const c = m.categoria as CategoriaObliviate;
    porCat.set(c, (porCat.get(c) ?? 0) + Number(m.importe));
  }

  // Agrupar por mes (desc)
  const porMes = new Map<string, typeof movs>();
  for (const m of delAnyo) {
    const ym = m.fecha.slice(0, 7);
    if (!porMes.has(ym)) porMes.set(ym, []);
    porMes.get(ym)!.push(m);
  }
  const mesesOrdenados = [...porMes.keys()].sort().reverse();
  const fmtFecha = (f: string) => { const [y, mm, d] = f.split("-"); return `${d}/${mm}`; };

  // Última subida del extracto (cuándo se importó por última vez) y hasta qué
  // día llegan los movimientos (para saber si está al día).
  const ultimaSubida = movs.reduce<Date | null>((max, m) => (!max || m.created_at > max ? m.created_at : max), null);
  const datosHasta = movs.reduce<string | null>((max, m) => (!max || m.fecha > max ? m.fecha : max), null);
  const fmtDT = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} a las ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const fmtDia = (f: string) => { const [y, mm, d] = f.split("-"); return `${d}/${mm}/${y}`; };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Obliviate</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Obliviate</h1>
          <p className="text-sm text-gray-400 mt-1">Movimientos del Sabadell de Obliviate · se importan del extracto y entran en la caja del grupo</p>
        </div>
        <div className="self-start flex flex-col items-end gap-1.5">
          <ExtractoUpload />
          {ultimaSubida && (
            <p className="text-[10px] text-gray-400 text-right">
              Última subida: <span className="font-semibold text-gray-500">{fmtDT(ultimaSubida)}</span>
              {datosHasta ? <> · datos hasta {fmtDia(datosHasta)}</> : null}
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Saldo inicial {anyo}</p>
          <p className="text-2xl font-black text-white">{saldoInicial != null ? fmtEur(saldoInicial) : "—"}</p>
          <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">a 31/12/{anyo - 1}</p>
        </div>
        <div className={`px-6 py-5 border ${flujo >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${flujo >= 0 ? "text-emerald-600" : "text-red-600"}`}>Variación del año</p>
          <p className={`text-2xl font-black ${flujo >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(flujo)}</p>
          <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">{delAnyo.length} movimientos</p>
        </div>
        <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
          <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">Saldo según extracto</p>
          <p className="text-2xl font-black text-[#2E1A47]">{saldoActual != null ? fmtEur(saldoActual) : "—"}</p>
          <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">hasta el último movimiento importado</p>
        </div>
        <div className="bg-white border border-gray-200 px-6 py-5">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Por categoría</p>
          <div className="space-y-0.5">
            {CATEGORIAS_OBLIVIATE.filter(c => Math.abs(porCat.get(c.key) ?? 0) > 0.005).map(c => (
              <p key={c.key} className="text-[10px] text-gray-500 flex justify-between gap-2">
                <span>{c.label}</span><span className="font-bold text-gray-700">{fmtEur(porCat.get(c.key)!)}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Movimientos por mes */}
      {mesesOrdenados.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-5 py-10 text-center text-sm text-gray-400">
          Sin movimientos. Sube el extracto del Sabadell (XLS de &quot;Consulta de movimientos&quot;) para importarlos.
        </div>
      ) : mesesOrdenados.map(ym => {
        const lista = porMes.get(ym)!;
        const netoMes = lista.reduce((s, m) => s + Number(m.importe), 0);
        const [, mm] = ym.split("-").map(Number);
        return (
          <section key={ym} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-[#EEEBF3] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">{MESES[mm - 1]} {ym.slice(0, 4)}</h2>
              <p className={`text-xs font-black ${netoMes >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(netoMes)}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {lista.map(m => (
                <div key={m.id} className="px-5 py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] text-gray-400 w-9 flex-shrink-0">{fmtFecha(m.fecha)}</span>
                    <CategoriaSelect id={m.id} categoria={m.categoria as CategoriaObliviate} />
                    <p className="text-xs text-gray-700 truncate">{m.concepto}</p>
                  </div>
                  <p className={`text-xs font-bold whitespace-nowrap ${Number(m.importe) >= 0 ? "text-emerald-700" : "text-gray-700"}`}>{fmtEur(Number(m.importe))}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-[11px] text-gray-400 mt-2">
        Cómo cuentan en el grupo: los <strong>cobros</strong> suman como ingresos del mes y las <strong>comisiones, tarjeta, impuestos, efectivo y otros</strong> como gastos. Los <strong>fijos</strong> no vuelven a sumar (ya están en los gastos fijos de Obliviate) y el <strong>intragrupo</strong> (facturación cruzada con Bearing) es neutro: para el grupo es dinero que cambia de bolsillo. Para actualizar, exporta de la web del Sabadell la &quot;Consulta de movimientos&quot; en XLS y súbela — los repetidos se descartan solos.
      </p>
    </div>
  );
}
