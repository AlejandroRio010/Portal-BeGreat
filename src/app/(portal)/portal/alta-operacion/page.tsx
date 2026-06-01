"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRODUCTOS_CONSULTORIA = [
  "Póliza de crédito",
  "Leasing",
  "Préstamo",
  "Confirming",
  "Factoring",
  "Renting financiero",
  "Otro",
];

const PLAZOS = [12, 24, 36, 48, 60, 72];

type Pipeline = "consultoria" | "renting";
type RentingRol = "proveedor" | "colaborador";

export default function AltaOperacionPage() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const [rentingRol, setRentingRol] = useState<RentingRol>("proveedor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: tipo, 2: detalles

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
    if (!res.ok) { setError("Error al enviar. Inténtalo de nuevo."); return; }

    router.push(pipeline === "consultoria" ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting");
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">
          La operación quedará en estado{" "}
          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Pendiente de validar
          </span>{" "}
          hasta que BeGreat la confirme.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* STEP 1: Tipo de operación */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider mb-4">Tipo de operación</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["consultoria", "renting"] as Pipeline[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPipeline(p)}
                className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  pipeline === p
                    ? "bg-[#2E1A47] text-white border-[#2E1A47] shadow-lg"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#2E1A47]/40"
                }`}
              >
                {p === "consultoria" ? "💼  Consultoría financiera" : "🖥  Renting de equipos"}
              </button>
            ))}
          </div>
        </div>

        {/* CONSULTORÍA */}
        {pipeline === "consultoria" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider">Datos de la operación</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de producto *</label>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCTOS_CONSULTORIA.map((p) => (
                  <label key={p} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-[#2E1A47]/40 has-[:checked]:border-[#2E1A47] has-[:checked]:bg-[#EEEBF3]">
                    <input type="radio" name="producto" value={p} required className="accent-[#2E1A47]" />
                    <span className="text-sm text-gray-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente *</label>
                <input name="cliente_nombre" required className={input} placeholder="Empresa S.L." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importe aproximado (€)</label>
                <input name="importe" type="number" step="1000" className={input} placeholder="50.000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email cliente</label>
                <input name="cliente_email" type="email" className={input} placeholder="contacto@empresa.es" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono cliente</label>
                <input name="cliente_telefono" className={input} placeholder="612 345 678" />
              </div>
            </div>

            <ContactPreference />
            <NotaField />
          </div>
        )}

        {/* RENTING */}
        {pipeline === "renting" && (
          <>
            {/* Rol del colaborador */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider mb-4">¿Cuál es tu rol en esta operación?</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRentingRol("proveedor")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    rentingRol === "proveedor"
                      ? "bg-[#2E1A47] text-white border-[#2E1A47]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#2E1A47]/40"
                  }`}
                >
                  <p className="font-semibold text-sm">🏭  Soy el proveedor</p>
                  <p className={`text-xs mt-1 ${rentingRol === "proveedor" ? "text-white/70" : "text-gray-400"}`}>
                    Suministro los equipos y necesito financiación para mi cliente
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRentingRol("colaborador")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    rentingRol === "colaborador"
                      ? "bg-[#2E1A47] text-white border-[#2E1A47]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#2E1A47]/40"
                  }`}
                >
                  <p className="font-semibold text-sm">🤝  Soy intermediario</p>
                  <p className={`text-xs mt-1 ${rentingRol === "colaborador" ? "text-white/70" : "text-gray-400"}`}>
                    Conozco al cliente o al proveedor y facilito la operación
                  </p>
                </button>
              </div>
            </div>

            {/* Datos del equipo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider">Datos del equipo</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de equipo *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "industrial", label: "🏗  Industrial", desc: "Maquinaria, vehículos, equipos de producción" },
                    { value: "tecnologico", label: "💻  Tecnológico", desc: "IT, servidores, impresoras, telecomunicaciones" },
                  ].map((t) => (
                    <label key={t.value} className="flex flex-col gap-1 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-[#2E1A47]/40 has-[:checked]:border-[#2E1A47] has-[:checked]:bg-[#EEEBF3]">
                      <div className="flex items-center gap-2">
                        <input type="radio" name="equipo_tipo" value={t.value} required className="accent-[#2E1A47]" />
                        <span className="text-sm font-medium text-gray-800">{t.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 pl-5">{t.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importe aproximado (€)</label>
                  <input name="importe" type="number" step="1000" className={input} placeholder="10.000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plazo deseado</label>
                  <select name="plazo_meses" className={input}>
                    <option value="">Seleccionar plazo</option>
                    {PLAZOS.map((m) => (
                      <option key={m} value={m}>{m} meses</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de entrega / instalación</label>
                <input name="lugar_entrega" className={input} placeholder="Dirección completa" />
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider">Datos del cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre empresa *</label>
                  <input name="cliente_nombre" required className={input} placeholder="Empresa S.L." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="cliente_email" type="email" className={input} placeholder="info@empresa.es" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input name="cliente_telefono" className={input} placeholder="612 345 678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                  <input name="cliente_web" className={input} placeholder="www.empresa.es" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Persona de contacto</p>
                <div className="grid grid-cols-3 gap-3">
                  <input name="contacto_nombre" className={input} placeholder="Nombre" />
                  <input name="contacto_email" type="email" className={input} placeholder="Email" />
                  <input name="contacto_telefono" className={input} placeholder="Teléfono" />
                </div>
              </div>
            </div>

            {/* Datos del proveedor (solo si es colaborador/intermediario) */}
            {rentingRol === "colaborador" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#2E1A47] uppercase tracking-wider">Datos del proveedor</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre proveedor</label>
                    <input name="proveedor_nombre" className={input} placeholder="Proveedor S.A." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input name="proveedor_email" type="email" className={input} placeholder="info@proveedor.es" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input name="proveedor_telefono" className={input} placeholder="612 345 678" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                    <input name="proveedor_web" className={input} placeholder="www.proveedor.es" />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Persona de contacto del proveedor</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input name="proveedor_contacto_nombre" className={input} placeholder="Nombre" />
                    <input name="proveedor_contacto_email" type="email" className={input} placeholder="Email" />
                    <input name="proveedor_contacto_telefono" className={input} placeholder="Teléfono" />
                  </div>
                </div>
              </div>
            )}

            <ContactPreference />
            <NotaField />
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-4 rounded-xl text-sm font-bold hover:bg-[#5a3d80] transition-all disabled:opacity-60 shadow-lg"
        >
          {loading ? "Enviando operación..." : "Enviar operación a BeGreat →"}
        </button>
      </form>
    </div>
  );
}

const input = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50";

function NotaField() {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Notas adicionales sobre la operación
      </label>
      <textarea
        name="descripcion"
        rows={4}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50 resize-none"
        placeholder="Cuéntanos más sobre la operación, contexto del cliente, urgencia, condiciones especiales..."
      />
    </div>
  );
}

function ContactPreference() {
  return (
    <div className="bg-[#EEEBF3] rounded-xl p-4">
      <p className="text-sm font-semibold text-[#2E1A47] mb-3">📞 Preferencia de contacto con el cliente</p>
      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="contacto_directo" value="false" defaultChecked className="mt-0.5 accent-[#2E1A47]" />
          <div>
            <p className="text-sm font-medium text-gray-800">Yo llevo la comunicación</p>
            <p className="text-xs text-gray-500">Prefiero gestionar yo mismo el contacto con el cliente. BeGreat me mantendrá informado.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="contacto_directo" value="true" className="mt-0.5 accent-[#2E1A47]" />
          <div>
            <p className="text-sm font-medium text-gray-800">BeGreat contacta directamente al cliente</p>
            <p className="text-xs text-gray-500">Autorizo a BeGreat a contactar directamente con el cliente en mi nombre.</p>
          </div>
        </label>
      </div>
    </div>
  );
}
