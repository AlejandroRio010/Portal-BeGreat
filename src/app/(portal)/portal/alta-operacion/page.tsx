"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRODUCTOS_CONSULTORIA = [
  "Póliza de crédito",
  "Leasing",
  "Préstamo",
  "Confirming",
  "Factoring",
  "Otro",
];

const PLAZOS = [12, 24, 36, 48, 60, 72];

type Pipeline = "consultoria" | "renting";
type RentingRol = "proveedor" | "colaborador";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function AltaOperacionPage() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const [rentingRol, setRentingRol] = useState<RentingRol>("proveedor");
  const [producto, setProducto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, pipeline_key: pipeline, renting_rol: rentingRol }),
    });

    setLoading(false);
    if (!res.ok) { setError("Error al enviar la operación. Inténtalo de nuevo."); return; }
    router.push(pipeline === "consultoria" ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting");
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-8 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">
          La operación quedará en estado{" "}
          <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 border border-amber-200">
            Pendiente de validar
          </span>{" "}
          hasta que BeGreat la revise y confirme.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de operación */}
        <Section title="Tipo de operación">
          <div className="grid grid-cols-2 gap-0 border border-gray-300">
            {(["consultoria", "renting"] as Pipeline[]).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPipeline(p)}
                className={`py-4 text-sm font-semibold transition-all ${i === 0 ? "border-r border-gray-300" : ""} ${
                  pipeline === p
                    ? "bg-[#2E1A47] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p === "consultoria" ? "Consultoría financiera" : "Renting de equipos"}
              </button>
            ))}
          </div>
        </Section>

        {/* ── CONSULTORÍA ──────────────────────────────────────────────── */}
        {pipeline === "consultoria" && (
          <>
            <Section title="Producto solicitado">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCTOS_CONSULTORIA.map((p) => (
                  <label
                    key={p}
                    className={`flex items-center gap-2 px-3 py-3 border text-sm cursor-pointer transition-all ${
                      producto === p
                        ? "border-[#2E1A47] bg-[#EEEBF3] font-semibold text-[#2E1A47]"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="producto"
                      value={p}
                      required
                      className="accent-[#2E1A47]"
                      onChange={() => setProducto(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
              {producto === "Otro" && (
                <div className="mt-3">
                  <label className={label}>Describe qué necesita tu cliente</label>
                  <textarea
                    name="producto_otro"
                    rows={2}
                    required
                    className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de financiación o producto que busca tu cliente..."
                  />
                </div>
              )}
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Nombre de la empresa *</label>
                  <input name="cliente_nombre" required className={inp} placeholder="Empresa S.L." />
                </div>
                <div>
                  <label className={label}>Importe (€)</label>
                  <input name="importe" type="number" step="1000" className={inp} placeholder="50.000" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input name="cliente_email" type="email" className={inp} placeholder="contacto@empresa.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input name="cliente_telefono" className={inp} placeholder="612 345 678" />
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ── RENTING ──────────────────────────────────────────────────── */}
        {pipeline === "renting" && (
          <>
            <Section title="Tu rol en esta operación">
              <div className="grid grid-cols-2 gap-0 border border-gray-300">
                {([
                  { val: "proveedor", label: "Soy el proveedor", desc: "Suministro los equipos y necesito financiación para mi cliente" },
                  { val: "colaborador", label: "Soy intermediario", desc: "Conozco al cliente o al proveedor y facilito la operación" },
                ] as const).map((r, i) => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setRentingRol(r.val)}
                    className={`p-4 text-left transition-all ${i === 0 ? "border-r border-gray-300" : ""} ${
                      rentingRol === r.val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className={`text-xs mt-1 ${rentingRol === r.val ? "text-white/60" : "text-gray-400"}`}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Datos del equipo">
              <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
                {[
                  { val: "industrial", label: "Industrial", desc: "Maquinaria, vehículos, producción" },
                  { val: "tecnologico", label: "Tecnológico", desc: "IT, servidores, impresoras" },
                ].map((t, i) => (
                  <label
                    key={t.val}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-all has-[:checked]:bg-[#EEEBF3] has-[:checked]:border-[#2E1A47] ${i === 0 ? "border-r border-gray-300" : ""}`}
                  >
                    <input type="radio" name="equipo_tipo" value={t.val} required className="mt-0.5 accent-[#2E1A47]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Importe (€)</label>
                  <input name="importe" type="number" step="1000" className={inp} placeholder="10.000" />
                </div>
                <div>
                  <label className={label}>Plazo deseado</label>
                  <select name="plazo_meses" className={inp}>
                    <option value="">Seleccionar</option>
                    {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={label}>Lugar de instalación / entrega</label>
                  <input name="lugar_entrega" className={inp} placeholder="Dirección completa" />
                </div>
              </div>
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Nombre de la empresa *</label>
                  <input name="cliente_nombre" required className={inp} placeholder="Empresa S.L." />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input name="cliente_email" type="email" className={inp} placeholder="info@empresa.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input name="cliente_telefono" className={inp} placeholder="612 345 678" />
                </div>
                <div>
                  <label className={label}>Web</label>
                  <input name="cliente_web" className={inp} placeholder="www.empresa.es" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
                <div className="grid grid-cols-3 gap-3">
                  <input name="contacto_nombre" className={inp} placeholder="Nombre" />
                  <input name="contacto_email" type="email" className={inp} placeholder="Email" />
                  <input name="contacto_telefono" className={inp} placeholder="Teléfono" />
                </div>
              </div>
            </Section>

            {rentingRol === "colaborador" && (
              <Section title="Datos del proveedor">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Nombre del proveedor</label>
                    <input name="proveedor_nombre" className={inp} placeholder="Proveedor S.A." />
                  </div>
                  <div>
                    <label className={label}>Email</label>
                    <input name="proveedor_email" type="email" className={inp} placeholder="info@proveedor.es" />
                  </div>
                  <div>
                    <label className={label}>Teléfono</label>
                    <input name="proveedor_telefono" className={inp} placeholder="612 345 678" />
                  </div>
                  <div>
                    <label className={label}>Web</label>
                    <input name="proveedor_web" className={inp} placeholder="www.proveedor.es" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto del proveedor</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input name="proveedor_contacto_nombre" className={inp} placeholder="Nombre" />
                    <input name="proveedor_contacto_email" type="email" className={inp} placeholder="Email" />
                    <input name="proveedor_contacto_telefono" className={inp} placeholder="Teléfono" />
                  </div>
                </div>
              </Section>
            )}
          </>
        )}

        {/* Notas y comunicación */}
        <Section title="Notas adicionales">
          <textarea
            name="descripcion"
            rows={4}
            className={inp + " resize-none"}
            placeholder="Cuéntanos el contexto de la operación, situación del cliente, urgencia, condiciones especiales..."
          />
        </Section>

        <Section title="Preferencia de comunicación con el cliente">
          <div className="border border-gray-200 divide-y divide-gray-100">
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="false" defaultChecked className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Yo gestiono la comunicación con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat me mantendrá informado del avance. En cualquier caso, antes de la firma siempre nos pondremos en contacto contigo para coordinar.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="true" className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Autorizo a BeGreat a contactar directamente con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat gestionará el contacto en tu nombre. Te mantendremos informado en todo momento y, antes de cualquier firma, nos coordinaremos contigo.</p>
              </div>
            </label>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-3.5 text-sm font-bold hover:bg-[#5a3d80] transition-colors disabled:opacity-60"
        >
          {loading ? "Enviando operación..." : "Enviar operación a BeGreat"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}
