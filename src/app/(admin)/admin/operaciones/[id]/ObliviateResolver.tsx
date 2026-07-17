"use client";

export interface ObliviateVal { importe: string; fecha: string; }

// Marca manual de un movimiento liquidado por Obliviate (fuera de Holded).
// Se usa cuando el buscador no encuentra la factura porque simplemente no está
// en Bearing/Holded. Guarda importe + fecha; en caja cuenta como pagado/cobrado.
export default function ObliviateResolver({ value, onChange, esperado, verbo }: {
  value: ObliviateVal | null;
  onChange: (v: ObliviateVal | null) => void;
  esperado?: number | string;
  verbo: "cobrado" | "pagado";
}) {
  if (!value) {
    return (
      <button type="button"
        onClick={() => onChange({ importe: esperado && Number(esperado) > 0 ? Number(esperado).toFixed(2) : "", fecha: "" })}
        className="mt-1.5 text-[10px] text-gray-400 hover:text-[#2E1A47] hover:underline">
        ¿No está en Holded? → marcar {verbo} desde Obliviate
      </button>
    );
  }
  return (
    <div className="mt-1.5 border border-dashed border-amber-300 bg-amber-50/60 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">🏢 {verbo} desde Obliviate</span>
        <button type="button" onClick={() => onChange(null)} className="text-[10px] text-gray-400 hover:text-red-500">✕ quitar</button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input type="number" step="0.01" placeholder="Importe €" value={value.importe}
          onChange={e => onChange({ ...value, importe: e.target.value })}
          className="border border-amber-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-amber-400" />
        <input type="date" value={value.fecha}
          onChange={e => onChange({ ...value, fecha: e.target.value })}
          className="border border-amber-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-amber-400" />
      </div>
    </div>
  );
}
