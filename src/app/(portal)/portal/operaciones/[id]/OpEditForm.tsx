"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fmtEuroInput, rawFromFmt } from "@/lib/format";
import AvalistasEditor, { type AvalistaForm, emptyAvalista, avalistasPayload } from "@/components/AvalistasEditor";

interface Props {
  opId: string;
  pipelineKey: string;
  initialProducto: string | null;
  initialImporte: string | null;
  initialDescripcion: string | null;
  initialPlazoMeses: number | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
  initialEsRenovacion?: boolean;
  initialOpOriginal?: { id: string; codigo: string | null; nombre: string | null } | null;
  initialNecesidad?: string | null;
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
  initialModalidadRenting?: string | null;
  initialCuotaAproxMin?: string | null;
  initialCuotaAproxMax?: string | null;
  initialCuotaDefinitiva?: string | null;
  initialFechaContrato?: string | null;
  initialFechaFinContrato?: string | null;
  initialCreatedAt?: string | null;
  initialFechaCierre?: string | null;
}

export default function OpEditForm({
  opId, pipelineKey,
  initialProducto, initialImporte, initialDescripcion,
  initialPlazoMeses, initialLugarEntrega, initialEquipoTipo,
  initialEsRenovacion, initialOpOriginal,
  initialNecesidad, initialTieneAval, initialAvalTipo,
  initialAvalNombre, initialAvalEmail, initialAvalTelefono,
  initialAvalPersonaContacto, initialAvalDni, initialAvalEmpresa,
  initialAvalContactId, initialAvalClientId,
  initialAvalistas = [],
  initialModalidadRenting, initialCuotaAproxMin, initialCuotaAproxMax, initialCuotaDefinitiva,
  initialFechaContrato, initialFechaFinContrato,
  initialCreatedAt, initialFechaCierre,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    producto: initialProducto ?? "",
    importe: initialImporte ?? "",
    descripcion: initialDescripcion ?? "",
    plazo_meses: initialPlazoMeses ? String(initialPlazoMeses) : "",
    lugar_entrega: initialLugarEntrega ?? "",
    equipo_tipo: initialEquipoTipo ?? "",
    necesidad: initialNecesidad ?? "",
    modalidad_renting: initialModalidadRenting ?? "",
    cuota_aproximada_min: initialCuotaAproxMin ?? "",
    cuota_aproximada_max: initialCuotaAproxMax ?? "",
    cuota_definitiva: initialCuotaDefinitiva ?? "",
  });
  const [esRenov, setEsRenov] = useState(!!initialEsRenovacion);
  const [opOriginal, setOpOriginal] = useState(initialOpOriginal ?? null);
  const [renovBusq, setRenovBusq] = useState("");
  const [renovRes, setRenovRes] = useState<any[]>([]);
  const [renovOpen, setRenovOpen] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aval state
  const [tieneAval, setTieneAval] = useState(!!initialTieneAval);
  const [avalistas, setAvalistas] = useState<AvalistaForm[]>(initialAvalistas);

  const [fechaContrato, setFechaContrato] = useState(initialFechaContrato ?? "");
  const [fechaFinContrato, setFechaFinContrato] = useState(initialFechaFinContrato ?? "");
  const [fechaAlta, setFechaAlta] = useState(initialCreatedAt ?? "");
  const [fechaCierre, setFechaCierre] = useState(initialFechaCierre ?? "");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  useEffect(() => {
    if (renovTimer.current) clearTimeout(renovTimer.current);
    if (renovBusq.length < 2) { setRenovRes([]); return; }
    renovTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/operations/search?q=${encodeURIComponent(renovBusq)}`);
      setRenovRes(await res.json()); setRenovOpen(true);
    }, 250);
  }, [renovBusq]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: form.producto || null,
          importe: form.importe || null,
          descripcion: form.descripcion || null,
          plazo_meses: form.plazo_meses || null,
          lugar_entrega: form.lugar_entrega || null,
          equipo_tipo: form.equipo_tipo || null,
          necesidad: form.necesidad || null,
          modalidad_renting: form.modalidad_renting || null,
          cuota_aproximada_min: form.cuota_aproximada_min || null,
          cuota_aproximada_max: form.cuota_aproximada_max || null,
          cuota_definitiva: form.cuota_definitiva || null,
          fecha_contrato: fechaContrato || null,
          fecha_fin_contrato: fechaFinContrato || null,
          created_at: fechaAlta || null,
          fecha_cierre: fechaCierre || null,
          es_renovacion: esRenov,
          operacion_original_id: esRenov ? (opOriginal?.id ?? null) : null,
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

  return (
    <div className="bg-white border border-gray-200 p-5 space-y-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Editar datos de la operación</p>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Importe (€)</label>
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
            <label className={labelCls}>
              {pipelineKey === "renting" ? "Tipo de equipo" : "Producto financiero"}
            </label>
            <input value={pipelineKey === "renting" ? form.equipo_tipo : form.producto}
              onChange={e => set(pipelineKey === "renting" ? "equipo_tipo" : "producto", e.target.value)}
              className={inputCls}
              placeholder={pipelineKey === "renting" ? "Vehículos, maquinaria..." : "Leasing, póliza crédito..."} />
          </div>
          {pipelineKey === "renting" && (
            <>
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
            </>
          )}
          <div>
            <label className={labelCls}>Fecha de alta</label>
            <input type="date" value={fechaAlta} onChange={e => setFechaAlta(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha de cierre</label>
            <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Necesidad / Descripción */}
        <div>
          <label className={labelCls}>{pipelineKey === "consultoria" ? "Necesidad del cliente" : "Descripción del equipo"}</label>
          <textarea value={pipelineKey === "consultoria" ? form.necesidad : form.descripcion}
            onChange={e => set(pipelineKey === "consultoria" ? "necesidad" : "descripcion", e.target.value)} rows={3}
            className={inputCls + " resize-none"}
            placeholder={pipelineKey === "consultoria" ? "Describe brevemente la necesidad del cliente..." : "Descripción del equipo a arrendar..."} />
        </div>

        {/* Modalidad renting */}
        {pipelineKey === "renting" && (
          <div>
            <label className={labelCls}>Modalidad</label>
            <div className="grid grid-cols-2 gap-0 border border-gray-200">
              {([
                ["begreat_comisiona", "BeGreat comisiona"],
                ["begreat_factura", "BeGreat factura"],
              ] as const).map(([val, lbl], i) => (
                <button key={val} type="button" onClick={() => set("modalidad_renting", val)}
                  className={`py-2.5 text-[11px] font-semibold transition-all ${i > 0 ? "border-l border-gray-200" : ""} ${
                    form.modalidad_renting === val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
        )}

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

        {/* Renovación */}
        <div className="pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" checked={esRenov} onChange={e => setEsRenov(e.target.checked)} className="w-4 h-4 accent-[#2E1A47]" />
            <span className="text-xs font-semibold text-gray-700">Es una renovación de una operación anterior</span>
          </label>
          {esRenov && (
            <div className="relative">
              {opOriginal ? (
                <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2">
                  <span className="text-xs font-semibold text-[#2E1A47]">{opOriginal.codigo} — {opOriginal.nombre}</span>
                  <button type="button" onClick={() => setOpOriginal(null)} className="text-[10px] text-gray-400 hover:text-red-500">✕ Cambiar</button>
                </div>
              ) : (
                <>
                  <input value={renovBusq} onChange={e => setRenovBusq(e.target.value)}
                    onBlur={() => setTimeout(() => setRenovOpen(false), 150)}
                    className={inputCls}
                    placeholder="Buscar operación a vincular..." autoComplete="off" />
                  {renovOpen && renovRes.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                      {renovRes.filter((o: any) => o.id !== opId).map((o: any) => (
                        <button key={o.id} type="button" onMouseDown={() => { setOpOriginal(o); setRenovBusq(""); setRenovOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                          <p className="text-xs font-semibold text-gray-800">{o.nombre ?? o.client_nombre}</p>
                          <p className="text-[10px] text-gray-400">{o.codigo} · {o.client_nombre}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
      )}
    </div>
  );
}
