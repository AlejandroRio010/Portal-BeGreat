"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDocId } from "@/lib/format";

const inp = "w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

interface Colab {
  id: string;
  nombre: string;
  email: string;
  identificador: string;
  activo: boolean;
  telefono?: string | null;
  cif?: string | null;
  web?: string | null;
  razon_social?: string | null;
  num_trabajadores?: number | null;
  es_autonomo?: boolean;
  irpf_pct?: string | number | null;
}

export default function ColaboradorEditModal({ colab }: { colab: Colab }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [esAutonomo, setEsAutonomo] = useState(!!colab.es_autonomo);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const nombreComercial = (form.get("nombre_comercial") as string)?.trim() || null;
    const razonSocial = (form.get("razon_social") as string)?.trim() || null;
    const data = {
      nombre: nombreComercial || razonSocial,
      email: form.get("email"),
      telefono: form.get("telefono") || null,
      cif: form.get("cif") || null,
      web: form.get("web") || null,
      razon_social: razonSocial,
      num_trabajadores: form.get("num_trabajadores") ? Number(form.get("num_trabajadores")) : null,
      activo: form.get("activo") === "true",
      es_autonomo: form.get("es_autonomo") === "on",
      irpf_pct: form.get("es_autonomo") === "on" && form.get("irpf_pct")
        ? Number(String(form.get("irpf_pct")).replace(",", "."))
        : null,
    };

    const res = await fetch(`/api/admin/colaboradores/${colab.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
    } else {
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); router.refresh(); }, 1200);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-[#2E1A47] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
        Editar →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full max-w-lg shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Editar colaborador</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Razón social *</label>
                    <input name="razon_social" defaultValue={colab.razon_social ?? colab.nombre} required className={inp} placeholder="Empresa S.L." />
                  </div>
                  <div>
                    <label className={lbl}>Nombre comercial <span className="text-gray-300 font-normal normal-case">(opcional)</span></label>
                    <input name="nombre_comercial" defaultValue={colab.nombre !== colab.razon_social ? colab.nombre : ""} className={inp} placeholder="Nombre visible" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>CIF</label>
                    <input name="cif" defaultValue={colab.cif ?? ""} onBlur={e => { e.target.value = formatDocId(e.target.value); }} className={inp} placeholder="B12345678" />
                  </div>
                  <div>
                    <label className={lbl}>Email empresa</label>
                    <input name="email" type="email" defaultValue={colab.email} className={inp} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Teléfono</label>
                    <input name="telefono" defaultValue={colab.telefono ?? ""} className={inp} placeholder="+34 600 000 000" />
                  </div>
                  <div>
                    <label className={lbl}>Nº trabajadores</label>
                    <input name="num_trabajadores" type="number" defaultValue={colab.num_trabajadores ?? ""} className={inp} placeholder="10" min="0" />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Web</label>
                  <input name="web" defaultValue={colab.web ?? ""} className={inp} placeholder="https://empresa.com" />
                </div>

                <div>
                  <label className={lbl}>Estado</label>
                  <select name="activo" defaultValue={colab.activo ? "true" : "false"} className={inp}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>

                <div className="bg-[#EEEBF3]/50 px-4 py-3 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" name="es_autonomo" checked={esAutonomo} onChange={e => setEsAutonomo(e.target.checked)} className="mt-0.5 accent-[#2E1A47]" />
                    <span className="text-xs text-gray-600">
                      <b className="text-[#2E1A47]">Es autónomo</b> — sus facturas llevan IVA 21% y retención de IRPF (se usa al buscar su pago y para impuestos).
                    </span>
                  </label>
                  {esAutonomo && (
                    <div className="pl-6">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Retención de IRPF (%)</label>
                      <div className="flex items-center gap-2">
                        <input name="irpf_pct" type="number" step="0.5" min="0" max="50"
                          defaultValue={colab.irpf_pct != null ? Number(colab.irpf_pct) : 7}
                          className="w-24 px-3 py-2 border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#2E1A47]" />
                        <span className="text-[10px] text-gray-400">7% autónomos nuevos · 15% el general</span>
                      </div>
                    </div>
                  )}
                </div>

                {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
                <button type="submit" disabled={loading} className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-60">
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
                {saved && <span className="text-sm text-emerald-600 font-medium">Guardado ✓</span>}
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
