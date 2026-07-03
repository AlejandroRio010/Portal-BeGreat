"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtEuroInput, rawFromFmt } from "@/lib/format";
import AvalistasEditor, { type AvalistaForm, emptyAvalista, avalistasPayload } from "@/components/AvalistasEditor";

interface Props {
  opId: string;
  initialImporte: string | null;
  initialDescripcion: string | null;
  initialPlazoMeses: number | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
  initialTieneAval?: boolean;
  initialAvalTipo?: string | null;
  initialAvalNombre?: string | null;
  initialAvalEmail?: string | null;
  initialAvalTelefono?: string | null;
  initialAvalPersonaContacto?: string | null;
  initialAvalDni?: string | null;
  initialAvalEmpresa?: string | null;
  initialAvalContactId?: string | null;
  initialAvalClientId?: string | null;
  initialAvalistas?: AvalistaForm[];
  initialCuotaAproxMin?: string | null;
  initialCuotaAproxMax?: string | null;
  initialCuotaDefinitiva?: string | null;
  initialFechaContrato?: string | null;
  initialFechaFinContrato?: string | null;
  initialCreatedAt?: string | null;
  initialFechaCierre?: string | null;
}

export default function OpEditForm({
  opId,
  initialImporte, initialDescripcion,
  initialPlazoMeses, initialLugarEntrega, initialEquipoTipo,
  initialCuotaAproxMin, initialCuotaAproxMax, initialCuotaDefinitiva,
  initialFechaContrato, initialFechaFinContrato,
  initialCreatedAt, initialFechaCierre,
  initialTieneAval, initialAvalTipo,
  initialAvalNombre, initialAvalEmail, initialAvalTelefono,
  initialAvalPersonaContacto, initialAvalDni, initialAvalEmpresa,
  initialAvalContactId, initialAvalClientId,
  initialAvalistas = [],
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    importe: initialImporte ?? "",
    descripcion: initialDescripcion ?? "",
    plazo_meses: initialPlazoMeses ? String(initialPlazoMeses) : "",
    lugar_entrega: initialLugarEntrega ?? "",
    equipo_tipo: initialEquipoTipo ?? "",
    cuota_aproximada_min: initialCuotaAproxMin ?? "",
    cuota_aproximada_max: initialCuotaAproxMax ?? "",
    cuota_definitiva: initialCuotaDefinitiva ?? "",
  });
  const [fechaContrato, setFechaContrato] = useState(initialFechaContrato ?? "");
  const [fechaFinContrato, setFechaFinContrato] = useState(initialFechaFinContrato ?? "");
  const [fechaAlta, setFechaAlta] = useState(initialCreatedAt ?? "");
  const [fechaCierre, setFechaCierre] = useState(initialFechaCierre ?? "");

  // Aval state
  const [tieneAval, setTieneAval] = useState(!!initialTieneAval);
  const [avalistas, setAvalistas] = useState<AvalistaForm[]>(initialAvalistas);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/proveedor/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importe: form.importe || null,
          descripcion: form.descripcion || null,
          plazo_meses: form.plazo_meses || null,
          lugar_entrega: form.lugar_entrega || null,
          equipo_tipo: form.equipo_tipo || null,
          cuota_aproximada_min: form.cuota_aproximada_min || null,
          cuota_aproximada_max: form.cuota_aproximada_max || null,
          cuota_definitiva: form.cuota_definitiva || null,
          fecha_contrato: fechaContrato || null,
          fecha_fin_contrato: fechaFinContrato || null,
          created_at: fechaAlta || null,
          fecha_cierre: fechaCierre || null,
          avalistas: tieneAval ? avalistasPayload(avalistas) : [],
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors">
        Editar datos
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos de la operación</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Importe (sin IVA)</label>
            <input type="text" inputMode="decimal"
              value={focusedField === "importe" ? form.importe : fmtEuroInput(form.importe)}
              onFocus={() => setFocusedField("importe")}
              onBlur={() => setFocusedField(null)}
              onChange={e => {
                const v = focusedField ? e.target.value : rawFromFmt(e.target.value);
                set("importe", v);
              }}
              className={inputCls} placeholder="0,00 €" />
          </div>
          <div>
            <label className={labelCls}>Tipo de equipo</label>
            <input value={form.equipo_tipo} onChange={e => set("equipo_tipo", e.target.value)}
              className={inputCls} placeholder="Vehículos, maquinaria..." />
          </div>
          <div>
            <label className={labelCls}>Plazo (meses)</label>
            <input type="number" value={form.plazo_meses} onChange={e => set("plazo_meses", e.target.value)}
              className={inputCls} placeholder="24" />
          </div>
          <div>
            <label className={labelCls}>Cuota aproximada (rango €/mes)</label>
            <div className="flex gap-2">
              <input type="text" inputMode="decimal" value={form.cuota_aproximada_min} onChange={e => set("cuota_aproximada_min", e.target.value)} placeholder="Mín" className={inputCls} />
              <span className="self-center text-gray-400">–</span>
              <input type="text" inputMode="decimal" value={form.cuota_aproximada_max} onChange={e => set("cuota_aproximada_max", e.target.value)} placeholder="Máx" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cuota definitiva (€/mes)</label>
            <input type="text" inputMode="decimal" value={form.cuota_definitiva} onChange={e => set("cuota_definitiva", e.target.value)} placeholder="Cuota definitiva cuando se confirme" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lugar de entrega</label>
            <input value={form.lugar_entrega} onChange={e => set("lugar_entrega", e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha inicio contrato</label>
            <input type="date" value={fechaContrato} onChange={e => {
              setFechaContrato(e.target.value);
              if (e.target.value && form.plazo_meses) {
                const d = new Date(e.target.value);
                d.setMonth(d.getMonth() + Number(form.plazo_meses));
                setFechaFinContrato(d.toISOString().split("T")[0]);
              }
            }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha fin contrato</label>
            <input type="date" value={fechaFinContrato} onChange={e => setFechaFinContrato(e.target.value)} className={inputCls} />
            {fechaContrato && form.plazo_meses && (
              <p className="text-[9px] text-gray-400 mt-0.5">Auto-calculada: inicio + {form.plazo_meses} meses</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Fecha de alta</label>
            <input type="date" value={fechaAlta} onChange={e => setFechaAlta(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha de cierre</label>
            <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Descripción del equipo</label>
          <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={3}
            className={inputCls + " resize-none"}
            placeholder="Descripción del equipo a arrendar..." />
        </div>

        {/* Aval */}
        <div className="pt-3 border-t border-gray-100">
          <label className={labelCls}>¿Aporta aval?</label>
          <div className="grid grid-cols-2 gap-0 border border-gray-200 mb-3">
            <button type="button" onClick={() => setTieneAval(false)}
              className={`py-2 text-xs font-semibold transition-all ${!tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>No</button>
            <button type="button" onClick={() => { setTieneAval(true); if (avalistas.length === 0) setAvalistas([emptyAvalista()]); }}
              className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Sí</button>
          </div>
          {tieneAval && (
            <AvalistasEditor avalistas={avalistas} onChange={setAvalistas} inputCls={inputCls} labelCls={labelCls} />
          )}
        </div>

        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : saved ? "¡Guardado ✓" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
