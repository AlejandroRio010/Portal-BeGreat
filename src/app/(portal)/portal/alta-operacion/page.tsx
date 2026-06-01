"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AltaOperacionPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"consultoria" | "renting">("consultoria");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());

    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, pipeline_key: tipo }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Error al crear la operación. Inténtalo de nuevo.");
      return;
    }

    router.push(tipo === "consultoria" ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting");
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">
          La operación quedará en estado <span className="font-medium text-orange-600">Pendiente de validar</span> hasta que BeGreat la confirme.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de producto</label>
            <div className="grid grid-cols-2 gap-3">
              {(["consultoria", "renting"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    tipo === t
                      ? "bg-[#2E1A47] text-white border-[#2E1A47]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#2E1A47]"
                  }`}
                >
                  {t === "consultoria" ? "Consultoría financiera" : "Renting"}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa cliente</label>
            <input
              name="cliente_nombre"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
              placeholder="Nombre de la empresa"
            />
          </div>

          {/* Importe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importe (€)</label>
            <input
              name="importe"
              type="number"
              step="0.01"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
              placeholder="0.00"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] resize-none"
              placeholder="Descripción breve de la operación..."
            />
          </div>

          {/* Renting extra fields */}
          {tipo === "renting" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input
                  name="proveedor_nombre"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de instalación / entrega</label>
                <input
                  name="lugar_entrega"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
                  placeholder="Dirección de entrega"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2E1A47] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5a3d80] transition-colors disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Dar de alta operación"}
          </button>
        </form>
      </div>
    </div>
  );
}
