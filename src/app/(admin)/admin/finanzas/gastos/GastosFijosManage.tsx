"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearGastoFijo, borrarGastoFijo, setEstadoFijo } from "./actions";

export interface CandidatoProveedor {
  proveedor: string;
  contactId: string | null;
  categoria: string;
  importe: number;      // importe de la última factura (sugerencia de mensual)
  fecha: string;        // YYYY-MM-DD de la última factura
  n: number;            // nº de facturas vistas de este proveedor
  yaFijo: boolean;
}

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const fechaCorta = (d: string) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

// ─── Botón + buscador de facturas para dar de alta un gasto fijo ──────────────
export function AddGastoFijoButton({ candidatos, categorias }: { candidatos: CandidatoProveedor[]; categorias: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<CandidatoProveedor | null>(null);
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
    setLabel(c.proveedor);
    setCategoria(c.categoria || categorias[0] || "");
    setMensual(c.importe ? String(c.importe.toFixed(2)) : "");
  }

  function cerrar() { setOpen(false); setSel(null); setQ(""); }

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
      });
      cerrar();
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E1A47] bg-[#EEEBF3] hover:bg-[#e2ddec] rounded-xl px-3 py-1.5 transition-colors">
        <span className="text-sm leading-none">＋</span> Añadir gasto fijo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={cerrar}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl mt-[6vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#2E1A47]">Añadir gasto fijo</h3>
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
                          <span className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{eur(c.importe)}</span>
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

export function ObliviateFijoCell({ id, ym, estado, aplica, esPasado }: {
  id: string; ym: string; estado: "pendiente" | "recibida" | "pagada"; aplica: boolean; esPasado: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!aplica) {
    return <div className="mx-auto w-8 h-8 rounded-lg bg-gray-50 border border-gray-100" title="No aplica este mes" />;
  }

  const cls = estado === "pagada" ? "bg-emerald-500 hover:bg-emerald-600 text-white"
    : estado === "recibida" ? "bg-amber-400 hover:bg-amber-500 text-white"
    : esPasado ? "bg-red-500 hover:bg-red-600 text-white"
    : "bg-gray-100 hover:bg-gray-200 text-gray-400";
  const icon = estado === "pagada" ? "✓" : estado === "recibida" ? "€" : esPasado ? "✕" : "▾";

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 180) });
    setOpen(true);
  }
  function elegir(nuevo: string) {
    setOpen(false);
    start(async () => { await setEstadoFijo(id, ym, nuevo); router.refresh(); });
  }

  return (
    <>
      <button ref={btnRef} type="button" disabled={pending} onClick={toggle}
        title="Elegir estado"
        className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold transition-colors disabled:opacity-60 ${cls}`}>
        {pending ? "…" : icon}
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-44 py-1" style={{ top: pos.top, left: pos.left }}>
            {ESTADO_OPCIONES.map(o => (
              <button key={o.val} type="button" onClick={() => elegir(o.val)}
                className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#EEEBF3] text-left">
                <span className={`w-2.5 h-2.5 rounded-full ${o.dot}`} />
                <span className="flex-1 text-gray-700">{o.label}</span>
                {estado === o.val && <span className="text-[#2E1A47] font-bold">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </>
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
