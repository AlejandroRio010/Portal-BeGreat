"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRODUCTOS = ["Póliza de crédito", "Leasing", "Préstamo", "Confirming", "Factoring", "Otro"];
const PLAZOS = [12, 24, 36, 48, 60, 72];

type Pipeline = "consultoria" | "renting";

const inp = "w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

interface Colab { id: string; nombre: string; codigo: string | null }

export default function AltaOpAdminForm({ colaboradores }: { colaboradores: Colab[] }) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, pipeline_key: pipeline, status: data.status || "activa" }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear la operación.");
      return;
    }
    const op = await res.json();
    router.push(`/admin/operaciones/${op.id}`);
  }

  return (
    <div className="max-w-[720px]">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Tipo de operación */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Tipo de operación</h2>
          <div className="grid grid-cols-2 gap-0 border border-gray-200">
            {(["consultoria", "renting"] as Pipeline[]).map((p, i) => (
              <button key={p} type="button" onClick={() => setPipeline(p)}
                className={`py-3.5 text-sm font-semibold transition-all ${i === 0 ? "border-r border-gray-200" : ""} ${
                  pipeline === p ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                {p === "consultoria" ? "Consultoría financiera" : "Renting de equipos"}
              </button>
            ))}
          </div>
        </div>

        {/* Colaborador */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Colaborador asignado</h2>
          <select name="collaborator_id" required className={inp}>
            <option value="">— Seleccionar colaborador —</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}{c.codigo ? ` (${c.codigo})` : ""}</option>
            ))}
          </select>
        </div>

        {/* Nombre (opcional para admin) */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Referencia de la operación</h2>
          <div>
            <label className={lbl}>Nombre / referencia</label>
            <input name="nombre" className={inp} placeholder="Opcional — se genera un código automático" />
            <p className="text-xs text-gray-400 mt-1.5">Si lo dejas vacío se identificará por el código automático (OP-XXX-XX).</p>
          </div>
        </div>

        {/* Estado inicial */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Estado inicial</h2>
          <select name="status" className={inp}>
            <option value="activa">Activa (directamente al funnel)</option>
            <option value="pendiente_de_validar">Pendiente de validar</option>
          </select>
        </div>

        {/* Datos del cliente */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos del cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nombre empresa *</label>
              <input name="cliente_nombre" required className={inp} placeholder="Empresa S.L." />
            </div>
            <div>
              <label className={lbl}>Importe (€)</label>
              <input name="importe" type="number" step="1000" className={inp} placeholder="50.000" />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input name="cliente_email" type="email" className={inp} placeholder="contacto@empresa.es" />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input name="cliente_telefono" className={inp} placeholder="612 345 678" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
            <div className="grid grid-cols-3 gap-3">
              <input name="contacto_nombre" className={inp} placeholder="Nombre" />
              <input name="contacto_email" type="email" className={inp} placeholder="Email" />
              <input name="contacto_telefono" className={inp} placeholder="Teléfono" />
            </div>
          </div>
        </div>

        {/* Consultoría: producto */}
        {pipeline === "consultoria" && (
          <div className="bg-white border border-gray-200 p-5">
            <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Producto financiero</h2>
            <select name="producto" className={inp}>
              <option value="">— Seleccionar —</option>
              {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {/* Renting: equipo + proveedor */}
        {pipeline === "renting" && (
          <>
            <div className="bg-white border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos del equipo</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Tipo de equipo</label>
                  <select name="equipo_tipo" className={inp}>
                    <option value="">— Seleccionar —</option>
                    <option value="industrial">Industrial</option>
                    <option value="tecnologico">Tecnológico</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Plazo (meses)</label>
                  <select name="plazo_meses" className={inp}>
                    <option value="">— Seleccionar —</option>
                    {PLAZOS.map(m => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Lugar de entrega</label>
                  <input name="lugar_entrega" className={inp} placeholder="Ciudad, dirección..." />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Proveedor</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Nombre</label>
                  <input name="proveedor_nombre" className={inp} placeholder="Proveedor S.A." />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input name="proveedor_email" type="email" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Teléfono</label>
                  <input name="proveedor_telefono" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Web</label>
                  <input name="proveedor_web" className={inp} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Descripción */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Notas / Descripción</h2>
          <textarea name="descripcion" rows={4} className={inp + " resize-none"} placeholder="Contexto de la operación, condiciones, urgencia..." />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-3.5 text-sm font-bold hover:bg-[#3d2460] transition-colors disabled:opacity-60">
          {loading ? "Creando operación..." : "Crear operación"}
        </button>
      </form>
    </div>
  );
}
