"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearGastoFijo, borrarGastoFijo, setEstadoFijo, setImporteBaseFijo, setCargoTarjeta, editarGastoFijo, setNotaMesFijo } from "./actions";

export interface CuentaProveedor {
  id: string;           // id de la cuenta contable en Holded
  label: string;        // etiqueta legible (categoría)
  base: number;         // base sin IVA de la última factura de esa cuenta
  n: number;            // nº de facturas de esa cuenta
  yaFijo: boolean;      // ya hay un fijo que cubre esta cuenta
}
export interface CandidatoProveedor {
  proveedor: string;
  contactId: string | null;
  categoria: string;
  importe: number;      // total con IVA de la última factura
  base: number;         // base sin IVA de la última factura (sugerencia de mensual)
  fecha: string;        // YYYY-MM-DD de la última factura
  n: number;            // nº de facturas vistas de este proveedor
  yaFijo: boolean;      // todas sus cuentas ya están cubiertas por fijos
  cuentas: CuentaProveedor[]; // desglose por cuenta contable (para separar facturas)
}

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const fechaCorta = (d: string) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

// ─── Botón para dar de alta un gasto fijo ─────────────────────────────────────
// Bearing → buscador de facturas de Holded (detecta por proveedor).
// Obliviate → alta manual (no está en Holded).
export function AddGastoFijoButton({ candidatos = [], categorias, empresa = "bearing" }: {
  candidatos?: CandidatoProveedor[]; categorias: string[]; empresa?: "bearing" | "obliviate";
}) {
  if (empresa === "obliviate") return <AddGastoFijoObliviate categorias={categorias} />;
  return <AddGastoFijoBearing candidatos={candidatos} categorias={categorias} />;
}

// ─── Alta Obliviate: formulario manual (nombre, concepto, importe base) ────────
function AddGastoFijoObliviate({ categorias }: { categorias: string[] }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [categoria, setCategoria] = useState(categorias[0] || "");
  const [nota, setNota] = useState("");
  const [mensual, setMensual] = useState("");
  const [periodicidad, setPeriodicidad] = useState<"mensual" | "anual">("mensual");
  const [mesCobro, setMesCobro] = useState("1");
  const [pending, start] = useTransition();
  const router = useRouter();

  function cerrar() { setOpen(false); setLabel(""); setNota(""); setMensual(""); setPeriodicidad("mensual"); }
  function guardar() {
    const l = label.trim();
    if (!l) return;
    const mensualNum = mensual.trim() === "" ? null : Number(mensual.replace(",", "."));
    start(async () => {
      await crearGastoFijo({
        label: l, proveedor_match: l, holded_contact_id: null,
        mensual: mensualNum, categoria: categoria || null, nota: nota.trim() || null,
        empresa: "obliviate", periodicidad,
        mes_cobro: periodicidad === "anual" ? Number(mesCobro) : null,
      });
      cerrar(); router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl px-3 py-1.5 transition-colors">
        <span className="text-sm leading-none">＋</span> Añadir
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={cerrar}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md mt-[8vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-amber-100 flex items-start justify-between gap-4 bg-amber-50/50">
              <div>
                <h3 className="text-lg font-bold text-amber-800">🏢 Añadir gasto fijo · Obliviate</h3>
                <p className="text-xs text-gray-400 mt-0.5">Manual (no está en Holded). El importe va <b>sin IVA</b>.</p>
              </div>
              <button onClick={cerrar} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                <input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej. Alquiler oficina"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Concepto / descripción <span className="text-gray-300 font-normal">(opcional)</span></label>
                <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. despacho de la calle…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-amber-400">
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Importe (€ sin IVA)</label>
                  <input value={mensual} onChange={e => setMensual(e.target.value)} inputMode="decimal" placeholder="0,00"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Periodicidad</label>
                  <select value={periodicidad} onChange={e => setPeriodicidad(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-amber-400">
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                {periodicidad === "anual" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Mes de cobro</label>
                    <select value={mesCobro} onChange={e => setMesCobro(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-amber-400">
                      {MESES_LARGOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end pt-2">
                <button onClick={guardar} disabled={pending || !label.trim()}
                  className="bg-amber-600 text-white text-sm font-semibold rounded-xl px-5 py-2.5 hover:bg-amber-700 disabled:opacity-50 transition-colors">
                  {pending ? "Guardando…" : "Añadir gasto fijo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ─── Alta Bearing: buscador de facturas de Holded ─────────────────────────────
function AddGastoFijoBearing({ candidatos, categorias }: { candidatos: CandidatoProveedor[]; categorias: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<CandidatoProveedor | null>(null);
  const [cuentaSel, setCuentaSel] = useState<CuentaProveedor | null>(null); // null = todas las cuentas
  const [label, setLabel] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mensual, setMensual] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    const arr = t ? candidatos.filter(c => c.proveedor.toLowerCase().includes(t)) : candidatos;
    return [...arr].sort((a, b) => Number(a.yaFijo) - Number(b.yaFijo) || b.fecha.localeCompare(a.fecha));
  }, [candidatos, q]);

  function elegir(c: CandidatoProveedor) {
    setSel(c);
    // Si solo tiene una cuenta libre, la elegimos directamente; si hay varias, "todas".
    const libres = c.cuentas.filter(cu => !cu.yaFijo);
    const cuentaInicial = c.cuentas.length > 1 && libres.length === 1 ? libres[0] : null;
    setCuentaSel(cuentaInicial);
    setLabel(cuentaInicial ? `${c.proveedor} · ${cuentaInicial.label}` : c.proveedor);
    setCategoria((cuentaInicial?.label) || c.categoria || categorias[0] || "");
    // Sugerimos la BASE (sin IVA) — el portal calcula el IVA por detrás.
    const base = cuentaInicial ? cuentaInicial.base : c.base;
    setMensual(base ? String(base.toFixed(2)) : "");
  }

  function elegirCuenta(cu: CuentaProveedor | null) {
    if (!sel) return;
    setCuentaSel(cu);
    setLabel(cu ? `${sel.proveedor} · ${cu.label}` : sel.proveedor);
    setCategoria((cu?.label) || sel.categoria || categorias[0] || "");
    const base = cu ? cu.base : sel.base;
    setMensual(base ? String(base.toFixed(2)) : "");
  }

  function cerrar() { setOpen(false); setSel(null); setCuentaSel(null); setQ(""); }

  function guardar() {
    if (!sel) return;
    const mensualNum = mensual.trim() === "" ? null : Number(mensual.replace(",", "."));
    start(async () => {
      await crearGastoFijo({
        label: label.trim() || sel.proveedor,
        proveedor_match: sel.proveedor,
        holded_contact_id: sel.contactId,
        mensual: mensualNum,
        categoria: categoria || null,
        nota: null,
        empresa: "bearing",
        cuenta_id: cuentaSel?.id ?? null,
        cuenta_label: cuentaSel?.label ?? null,
      });
      cerrar();
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E1A47] bg-[#EEEBF3] hover:bg-[#e2ddec] rounded-xl px-3 py-1.5 transition-colors">
        <span className="text-sm leading-none">＋</span> Añadir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={cerrar}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl mt-[6vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#2E1A47]">Añadir gasto fijo · Bearing</h3>
                <p className="text-xs text-gray-400 mt-0.5">Elige el proveedor de una factura de Holded. El portal lo tratará como fijo y vigilará mes a mes si llega y se paga.</p>
              </div>
              <button onClick={cerrar} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
            </div>

            {!sel ? (
              <>
                <div className="px-6 pt-4">
                  <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar proveedor…"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
                </div>
                <div className="px-6 py-4 max-h-[52vh] overflow-y-auto">
                  {lista.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No hay facturas de proveedores para mostrar.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {lista.map(c => (
                        <button key={(c.contactId ?? c.proveedor) + c.fecha} disabled={c.yaFijo} onClick={() => elegir(c)}
                          className={`w-full text-left flex items-center gap-3 py-2.5 px-2 rounded-xl ${c.yaFijo ? "opacity-50 cursor-default" : "hover:bg-[#EEEBF3]/50"}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{c.proveedor}</p>
                            <p className="text-[11px] text-gray-400">{c.categoria} · {c.n} factura{c.n !== 1 ? "s" : ""} · última {fechaCorta(c.fecha)}</p>
                          </div>
                          <span className="text-sm font-bold text-[#2E1A47] whitespace-nowrap" title="Base sin IVA de la última factura">{eur(c.base)} <span className="text-[9px] font-normal text-gray-400">s/IVA</span></span>
                          {c.yaFijo
                            ? <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5">Ya es fijo</span>
                            : <span className="text-[#2E1A47] text-xs font-semibold">＋</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div className="bg-[#EEEBF3]/60 rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Proveedor</p>
                  <p className="text-sm font-bold text-[#2E1A47]">{sel.proveedor}</p>
                </div>

                {sel.cuentas.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Este proveedor tiene <b>{sel.cuentas.length} tipos de factura</b> — ¿cuál es este fijo?
                    </label>
                    <div className="space-y-1.5">
                      <button type="button" onClick={() => elegirCuenta(null)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${cuentaSel === null ? "border-[#2E1A47] bg-[#EEEBF3]/60" : "border-gray-200 hover:bg-gray-50"}`}>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${cuentaSel === null ? "border-[#2E1A47] bg-[#2E1A47]" : "border-gray-300"}`} />
                        <span className="flex-1 text-sm text-gray-700">Todas las facturas de {sel.proveedor}</span>
                      </button>
                      {sel.cuentas.map(cu => (
                        <button key={cu.id} type="button" disabled={cu.yaFijo} onClick={() => elegirCuenta(cu)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${cu.yaFijo ? "opacity-40 cursor-default border-gray-100" : cuentaSel?.id === cu.id ? "border-[#2E1A47] bg-[#EEEBF3]/60" : "border-gray-200 hover:bg-gray-50"}`}>
                          <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${cuentaSel?.id === cu.id ? "border-[#2E1A47] bg-[#2E1A47]" : "border-gray-300"}`} />
                          <span className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">{cu.label}</span>
                            <span className="text-[11px] text-gray-400 ml-1">· {cu.n} factura{cu.n !== 1 ? "s" : ""}</span>
                          </span>
                          <span className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{eur(cu.base)} <span className="text-[9px] font-normal text-gray-400">s/IVA</span></span>
                          {cu.yaFijo && <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">ya fijo</span>}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Elige una cuenta para separar, p. ej., telecomunicaciones del renting. Puedes crear otro fijo para la otra factura.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre en el panel</label>
                  <input value={label} onChange={e => setLabel(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
                    <select value={categoria} onChange={e => setCategoria(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E1A47]/40">
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Importe mensual (€)</label>
                    <input value={mensual} onChange={e => setMensual(e.target.value)} inputMode="decimal" placeholder="Vacío si varía"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
                    <p className="text-[10px] text-gray-400 mt-1">Déjalo vacío si el importe cambia cada mes.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setSel(null)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">← Elegir otro</button>
                  <button onClick={guardar} disabled={pending}
                    className="bg-[#2E1A47] text-white text-sm font-semibold rounded-xl px-5 py-2.5 hover:bg-[#3d2560] disabled:opacity-50 transition-colors">
                    {pending ? "Guardando…" : "Guardar como gasto fijo"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Celda del grid de Obliviate: clic → desplegable para elegir el estado ─────
const ESTADO_OPCIONES = [
  { val: "pendiente", label: "Sin marcar", dot: "bg-gray-200" },
  { val: "recibida", label: "Factura recibida", dot: "bg-amber-400" },
  { val: "pagada", label: "Pagada", dot: "bg-emerald-500" },
];

export function ObliviateFijoCell({ id, ym, estado, importe, aplica, esPasado, compact = false }: {
  id: string; ym: string; estado: "pendiente" | "recibida" | "pagada"; importe: number | null; aplica: boolean; esPasado: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [imp, setImp] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const w = compact ? "w-8" : "w-14";
  const mesNombre = MESES_LARGOS[Number(ym.split("-")[1]) - 1] ?? "";

  if (!aplica) {
    return <div className={`mx-auto ${w} h-8 rounded-lg bg-gray-50 border border-gray-100`} title={`${mesNombre} · no aplica este mes`} />;
  }

  const cls = estado === "pagada" ? "bg-emerald-500 hover:bg-emerald-600 text-white"
    : estado === "recibida" ? "bg-amber-400 hover:bg-amber-500 text-white"
    : esPasado ? "bg-red-500 hover:bg-red-600 text-white"
    : "bg-gray-100 hover:bg-gray-200 text-gray-500";
  const disp = compact
    ? (estado === "pagada" ? "✓" : estado === "recibida" ? "€" : esPasado ? "✕" : "▾")
    : (importe != null ? Math.round(importe).toLocaleString("es-ES") : "▾");

  function toggle() {
    if (open) { setOpen(false); return; }
    setImp(importe != null ? String(importe) : "");
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 220) });
    setOpen(true);
  }
  function elegirEstado(nuevo: string) {
    setOpen(false);
    start(async () => { await setEstadoFijo(id, ym, nuevo, undefined); router.refresh(); });
  }
  function guardarImporte() {
    setOpen(false);
    const val = imp.trim() === "" ? null : Number(imp.replace(",", "."));
    start(async () => { await setEstadoFijo(id, ym, undefined, val); router.refresh(); });
  }

  return (
    <>
      <button ref={btnRef} type="button" disabled={pending} onClick={toggle}
        title={`${mesNombre} · ${importe != null ? eur(importe) + " · " : ""}elegir estado / importe`}
        className={`mx-auto ${w} h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-60 ${cls}`}>
        {pending ? "…" : disp}
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-52 py-1" style={{ top: pos.top, left: pos.left }}>
            <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Estado</p>
            {ESTADO_OPCIONES.map(o => (
              <button key={o.val} type="button" onClick={() => elegirEstado(o.val)}
                className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#EEEBF3] text-left">
                <span className={`w-2.5 h-2.5 rounded-full ${o.dot}`} />
                <span className="flex-1 text-gray-700">{o.label}</span>
                {estado === o.val && <span className="text-[#2E1A47] font-bold">✓</span>}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 px-3 py-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Importe de este mes (€ sin IVA)</label>
              <div className="flex gap-1.5">
                <input autoFocus type="number" step="0.01" value={imp} onChange={e => setImp(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") guardarImporte(); }}
                  className="flex-1 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#2E1A47]" placeholder="0,00" />
                <button type="button" onClick={guardarImporte} className="bg-[#2E1A47] text-white text-xs font-semibold rounded-lg px-3">OK</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Importe base editable (columna €/mes) ────────────────────────────────────
export function ImporteBaseFijoEdit({ id, mensual, periodicidad, tono = "obliviate" }: {
  id: string; mensual: number | null; periodicidad: string; tono?: "bearing" | "obliviate";
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const txt = tono === "bearing" ? "text-[#2E1A47]" : "text-amber-800";
  const brd = tono === "bearing" ? "border-[#2E1A47]/40" : "border-amber-300";

  function guardar() {
    setEditing(false);
    const n = val.trim() === "" ? null : Number(val.replace(",", "."));
    start(async () => { await setImporteBaseFijo(id, n); router.refresh(); });
  }

  if (editing) {
    return (
      <input autoFocus type="number" step="0.01" value={val}
        onChange={e => setVal(e.target.value)} onBlur={guardar}
        onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
        className={`w-20 border ${brd} rounded px-1.5 py-1 text-sm text-right focus:outline-none`} />
    );
  }
  return (
    <button type="button" disabled={pending}
      onClick={() => { setVal(mensual != null ? String(mensual) : ""); setEditing(true); }}
      title="Editar importe (sin IVA)" className={`text-sm font-bold ${txt} hover:underline whitespace-nowrap`}>
      {pending ? "…" : (mensual != null ? `${eur(mensual)}${periodicidad === "anual" ? "/año" : ""}` : "＋ importe")}
    </button>
  );
}

// ─── Nombre + concepto editables de un gasto fijo ─────────────────────────────
export function FijoInfoEdit({ id, label, nota, categoria, tono = "bearing" }: {
  id: string; label: string; nota?: string | null; categoria: string; tono?: "bearing" | "obliviate";
}) {
  const [editing, setEditing] = useState(false);
  const [l, setL] = useState(label);
  const [n, setN] = useState(nota ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const accent = tono === "bearing" ? "focus:border-[#2E1A47]/40" : "focus:border-amber-400";

  function guardar() {
    setEditing(false);
    start(async () => { await editarGastoFijo(id, { label: l, nota: n }); router.refresh(); });
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <input autoFocus value={l} onChange={e => setL(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
          className={`w-full border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none ${accent}`} />
        <input value={n} onChange={e => setN(e.target.value)} placeholder="Concepto / descripción…"
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
          className={`w-full border border-gray-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none ${accent}`} />
        <div className="flex gap-2 pt-0.5">
          <button type="button" onClick={guardar} disabled={pending} className="text-[10px] font-bold text-white bg-[#2E1A47] rounded px-2 py-0.5 disabled:opacity-50">{pending ? "…" : "Guardar"}</button>
          <button type="button" onClick={() => { setEditing(false); setL(label); setN(nota ?? ""); }} className="text-[10px] text-gray-400 hover:text-gray-600">Cancelar</button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} title="Editar nombre y concepto" className="text-left group/edit block min-w-0">
      <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
        {label}
        <span className="opacity-0 group-hover/edit:opacity-100 text-gray-300 text-[10px] transition-opacity">✎</span>
      </p>
      <p className="text-[10px] text-gray-400 truncate">{categoria}{nota ? ` · ${nota}` : ""}</p>
    </button>
  );
}

// ─── Celda de mes de Bearing: estado (de Holded) + aviso de sobrecoste + nota ──
export interface BearingMes {
  ym: string;                 // clave no-padded "2026-3" (para la nota)
  estado: "pagado" | "sin_pagar" | "falta" | "futuro";
  base: number;               // suma base (sin IVA) del mes
  n: number;                  // nº de facturas
  holdedId: string | null;
  overcharge: boolean;        // base del mes > estipulado
  exceso: number;             // cuánto por encima del estipulado
  nota: string | null;        // explicación guardada de ese mes
}

const COLOR_MES: Record<string, string> = {
  pagado: "bg-emerald-500 text-white",
  sin_pagar: "bg-amber-400 text-white",
  falta: "bg-red-500 text-white",
  futuro: "bg-gray-100 text-gray-300",
};

const holdedPurchaseUrl = (hid: string) => `https://app.holded.com/expenses/list#open:purchase-${hid}`;

export function BearingMesCell({ id, mes, estipulado }: {
  id: string; mes: BearingMes; estipulado: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [texto, setTexto] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const symbol = mes.estado === "pagado" ? "✓" : mes.estado === "sin_pagar" ? "€" : mes.estado === "falta" ? "✕" : "";
  const mesNombre = MESES_LARGOS[Number(mes.ym.split("-")[1]) - 1] ?? "";

  function toggle() {
    if (open) { setOpen(false); return; }
    setTexto(mes.nota ?? "");
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 260) });
    setOpen(true);
  }
  function guardarNota() {
    setOpen(false);
    start(async () => { await setNotaMesFijo(id, mes.ym, texto.trim() || null); router.refresh(); });
  }
  // "Contratamos algo más": adopta el importe real de este mes como el nuevo
  // importe fijo, para que deje de saltar el aviso todos los meses.
  function fijarNuevoImporte() {
    setOpen(false);
    start(async () => { await setImporteBaseFijo(id, Math.round(mes.base * 100) / 100); router.refresh(); });
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} disabled={pending}
        title={`${mesNombre} · ${mes.n > 0 ? `${eur(mes.base)} s/IVA · ${mes.n} factura${mes.n !== 1 ? "s" : ""}` : mes.estado === "falta" ? "sin factura (mes pasado)" : "aún no toca"}`}
        className={`relative mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold transition-colors disabled:opacity-50 ${COLOR_MES[mes.estado]} ${mes.overcharge ? "ring-2 ring-red-500 ring-offset-1" : ""}`}>
        {pending ? "…" : symbol}
        {mes.overcharge && <span className="absolute -top-2 -right-1.5 text-[11px] leading-none">⚠️</span>}
        {!mes.overcharge && mes.nota && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2E1A47] border border-white" />}
        {mes.n > 1 && <span className="absolute -bottom-1 -right-1 bg-[#2E1A47] text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center">{mes.n}</span>}
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-64 p-3" style={{ top: pos.top, left: pos.left }}>
            {mes.n > 0 ? (
              <div className="mb-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Cobrado (base)</span>
                  <span className={`text-sm font-black ${mes.overcharge ? "text-red-600" : "text-[#2E1A47]"}`}>{eur(mes.base)}</span>
                </div>
                {estipulado != null && (
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Estipulado</span>
                    <span className="text-xs text-gray-500">{eur(estipulado)}</span>
                  </div>
                )}
                {mes.overcharge && (
                  <>
                    <p className="mt-1.5 text-[11px] font-bold text-red-600 bg-red-50 rounded-lg px-2 py-1">⚠️ {eur(mes.exceso)} más de lo estipulado</p>
                    <button type="button" onClick={fijarNuevoImporte}
                      className="mt-1.5 w-full text-[11px] font-semibold text-[#2E1A47] bg-[#EEEBF3] hover:bg-[#e2ddec] rounded-lg px-2 py-1.5 transition-colors">
                      Es el nuevo importe fijo → poner {eur(mes.base)}
                    </button>
                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">Úsalo si has contratado algo más y este es el importe a partir de ahora (deja de avisar).</p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 mb-2">Sin facturas este mes.</p>
            )}
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Nota / explicación</label>
            <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)} rows={2}
              placeholder={mes.overcharge ? "Ej. se añadieron 2 licencias…" : "Anotar algo de este mes…"}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#2E1A47] resize-none" />
            <div className="flex items-center justify-between mt-2">
              {mes.holdedId ? (
                <a href={holdedPurchaseUrl(mes.holdedId)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-[#2E1A47] hover:underline">Abrir en Holded ↗</a>
              ) : <span />}
              <button type="button" onClick={guardarNota} className="bg-[#2E1A47] text-white text-xs font-semibold rounded-lg px-3 py-1">Guardar</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Cargo mensual de la tarjeta de crédito (editable) ────────────────────────
export function CargoTarjetaEdit({ year, month, importe }: { year: number; month: number; importe: number | null }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function guardar() {
    setEditing(false);
    const n = val.trim() === "" ? null : Number(val.replace(",", "."));
    start(async () => { await setCargoTarjeta(year, month, n); router.refresh(); });
  }

  if (editing) {
    return (
      <input autoFocus type="number" step="0.01" value={val}
        onChange={e => setVal(e.target.value)} onBlur={guardar}
        onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
        className="w-32 border border-[#2E1A47]/30 rounded-lg px-2 py-1 text-xl font-black text-[#2E1A47] focus:outline-none" placeholder="0,00 €" />
    );
  }
  return (
    <button type="button" disabled={pending}
      onClick={() => { setVal(importe != null ? String(importe) : ""); setEditing(true); }}
      title="Editar el cargo de la tarjeta de este mes"
      className={`text-xl font-black hover:underline ${importe != null ? "text-[#2E1A47]" : "text-gray-300"}`}>
      {pending ? "…" : (importe != null ? eur(importe) : "+ poner cargo")}
    </button>
  );
}

// ─── Botón para quitar un gasto fijo (solo admin) ─────────────────────────────
export function RemoveGastoFijoButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (!confirm(`¿Quitar "${label}" de gastos fijos? Sus facturas pasarán a contar como gasto variable.`)) return;
        start(async () => { await borrarGastoFijo(id); router.refresh(); });
      }}
      disabled={pending}
      title="Quitar de gastos fijos"
      className="text-gray-300 hover:text-red-500 text-sm disabled:opacity-40 transition-colors">
      {pending ? "…" : "🗑"}
    </button>
  );
}
