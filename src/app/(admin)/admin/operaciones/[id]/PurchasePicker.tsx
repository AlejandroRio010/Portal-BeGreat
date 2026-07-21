"use client";

import { useRef, useState } from "react";
import { fmtEuroInput } from "@/lib/format";

export interface PurchaseLink { id: string; number: string | null; }

const ACCENTS = {
  purple: { dot: "bg-[#2E1A47]", chip: "border-[#2E1A47]/20 bg-[#EEEBF3]", chipText: "text-[#2E1A47]" },
  amber: { dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50", chipText: "text-amber-800" },
};

// Buscador de facturas de COMPRA de Holded para vincular al pago de una op.
// Reutiliza el endpoint /api/admin/holded/purchases (casa por contraparte + importe,
// con IVA 21% e IRPF 7% por detrás). Igual que el cobro pero del lado del pago.
export default function PurchasePicker({
  opId, contraparte, esperado, selected, onChange,
  accent = "purple", placeholder = "Buscar factura de pago…", hint, autonomo = null,
}: {
  opId: string;
  contraparte: string;
  esperado: number | string;
  selected: PurchaseLink[];
  onChange: (next: PurchaseLink[]) => void;
  accent?: "purple" | "amber";
  placeholder?: string;
  hint?: string;
  /** Tipo fiscal de la contraparte: true = autónomo (×1,14), false = empresa (×1,21),
   *  null = desconocido (el buscador prueba todos los objetivos). */
  autonomo?: boolean | null;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todas, setTodas] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const a = ACCENTS[accent];

  async function buscar(query: string, all: boolean) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, opId });
      if (all) params.set("todas", "1");
      if (contraparte) params.set("contraparte", contraparte);
      if (esperado && Number(esperado) > 0) params.set("esperado", String(esperado));
      if (autonomo != null) params.set("autonomo", autonomo ? "1" : "0");
      const res = await fetch(`/api/admin/holded/purchases?${params}`);
      setResults(res.ok ? await res.json() : []);
    } catch { setResults([]); } finally { setLoading(false); }
  }
  function onFocus() { setOpen(true); if (results.length === 0) buscar("", todas); }
  function onQuery(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(v, todas), 300);
  }

  const disponibles = results.filter(r => !selected.some(s => s.id === r.id));

  return (
    <div>
      {selected.map(f => (
        <div key={f.id} className={`flex items-center justify-between rounded-xl border ${a.chip} px-3 py-2 mb-1.5`}>
          <p className={`text-xs font-bold ${a.chipText} truncate`}>Factura {f.number ?? f.id}</p>
          <button type="button" onClick={() => onChange(selected.filter(x => x.id !== f.id))}
            className="text-[10px] text-gray-400 hover:text-red-500 flex-shrink-0 ml-2">✕ Quitar</button>
        </div>
      ))}

      <div className="relative">
        <input value={q}
          onChange={e => onQuery(e.target.value)}
          onFocus={onFocus}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#2E1A47]"
          placeholder={selected.length > 0 ? "+ Añadir otra factura (pago en 2 partes)…" : placeholder} autoComplete="off" />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-[#2E1A47] animate-spin rounded-full" />}
        {open && (
          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 cursor-pointer sticky top-0">
              <input type="checkbox" checked={todas}
                onChange={e => { setTodas(e.target.checked); buscar(q, e.target.checked); }}
                className="w-3.5 h-3.5 accent-[#2E1A47]" />
              <span className="text-[10px] text-gray-500">Ver todas (sin filtrar por {contraparte || "contraparte"})</span>
            </label>
            {disponibles.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">{loading ? "Buscando…" : "Sin facturas de compra disponibles."}</p>
            ) : disponibles.map((f: any) => (
              <button key={f.id} type="button"
                onMouseDown={() => { onChange([...selected, { id: f.id, number: f.numero }]); setOpen(false); setQ(""); }}
                className={`w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0 ${f.coincide_importe ? "bg-emerald-50/40" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{f.proveedor}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${f.estado === "pagada" ? "bg-emerald-100 text-emerald-700" : f.estado === "parcial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{f.estado === "pagada" ? "Pagada" : f.estado === "parcial" ? "Parcial" : "Pendiente"}</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {f.numero} · {fmtEuroInput(String(f.total))}€ · {new Date(f.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  {f.retencion > 0 && <span className="text-amber-600"> · IRPF −{fmtEuroInput(String(f.retencion))}€</span>}
                  {f.coincide_importe && <span className="text-emerald-600 font-semibold"> · ✓ cuadra</span>}
                </p>
              </button>
            ))}
          </div>
        )}
        {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
      </div>
    </div>
  );
}
