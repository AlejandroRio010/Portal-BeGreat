"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50";

export default function PerfilForm({ colab }: { colab: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-5">Logo de la empresa</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl bg-[#EEEBF3] flex items-center justify-center overflow-hidden border-2 border-dashed border-[#2E1A47]/20">
            {colab?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={colab.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl text-[#2E1A47]/30">🏢</span>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del logo</label>
            <input name="logo_url" defaultValue={colab?.logo_url ?? ""} className={input} placeholder="https://tuempresa.es/logo.png" />
            <p className="text-xs text-gray-400 mt-1">Sube el logo a tu web y pega aquí la URL. Formatos: PNG, SVG, JPG</p>
          </div>
        </div>
      </div>

      {/* Datos empresa */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 space-y-4">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
            <input name="nombre" defaultValue={colab?.nombre ?? ""} required className={input} placeholder="Tu empresa" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
            <input name="razon_social" defaultValue={colab?.razon_social ?? ""} className={input} placeholder="Tu Empresa S.L." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CIF / NIF</label>
            <input name="cif" defaultValue={colab?.cif ?? ""} className={input} placeholder="B12345678" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nº trabajadores</label>
            <input name="num_trabajadores" type="number" defaultValue={colab?.num_trabajadores ?? ""} className={input} placeholder="10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
            <input name="email" defaultValue={colab?.email ?? ""} className={input} placeholder="info@tuempresa.es" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input name="telefono" defaultValue={colab?.telefono ?? ""} className={input} placeholder="612 345 678" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
          <input name="web" defaultValue={colab?.web ?? ""} className={input} placeholder="https://tuempresa.es" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#2E1A47] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#5a3d80] transition-all disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">✓ Guardado correctamente</span>
        )}
      </div>
    </form>
  );
}
