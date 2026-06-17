"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDocId } from "@/lib/format";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function PerfilForm({ colab }: { colab: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(colab?.logo_url ?? "");
  const [logoUrl, setLogoUrl] = useState<string>(colab?.logo_url ?? "");
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { if (k !== "logo_file") data[k] = v as string; });
    data.logo_url = logoUrl;

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
      <div className="bg-white border border-gray-200 p-6 mb-5">
        <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">Logo de la empresa</h2>
        <div className="flex items-start gap-5">
          {/* Preview */}
          <div className="w-20 h-20 bg-[#EEEBF3] flex items-center justify-center overflow-hidden border border-dashed border-[#2E1A47]/30 flex-shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-[#2E1A47]/40 text-center px-2">Sin logo</span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {/* Mode toggle */}
            <div className="flex border border-gray-300 w-fit">
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`px-4 py-1.5 text-xs font-semibold transition-all ${uploadMode === "url" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode("file"); fileRef.current?.click(); }}
                className={`px-4 py-1.5 text-xs font-semibold border-l border-gray-300 transition-all ${uploadMode === "file" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Subir desde ordenador
              </button>
            </div>

            {uploadMode === "url" ? (
              <div>
                <label className={lbl}>URL del logo</label>
                <input
                  name="logo_url_input"
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setLogoPreview(e.target.value); }}
                  className={inp}
                  placeholder="https://tuempresa.es/logo.png"
                />
              </div>
            ) : (
              <div>
                <label className={lbl}>Archivo</label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {logoPreview && uploadMode === "file" ? "Cambiar archivo" : "Seleccionar archivo"}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG o SVG. Máx. 2 MB.</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleFileChange(e); setUploadMode("file"); }}
            />
          </div>
        </div>
      </div>

      {/* Datos empresa */}
      <div className="bg-white border border-gray-200 p-6 mb-5 space-y-4">
        <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest pb-3 border-b border-gray-100">Datos de la empresa</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Razón social *</label>
            <input name="razon_social" defaultValue={colab?.razon_social ?? colab?.nombre ?? ""} required className={inp} placeholder="Tu Empresa S.L." />
          </div>
          <div>
            <label className={lbl}>Nombre comercial <span className="text-gray-300 font-normal normal-case">(opcional)</span></label>
            <input name="nombre_comercial" defaultValue={colab?.nombre !== colab?.razon_social ? (colab?.nombre ?? "") : ""} className={inp} placeholder="Nombre visible en la plataforma" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>CIF / NIF</label>
            <input name="cif" defaultValue={colab?.cif ?? ""}
              onBlur={e => { e.target.value = formatDocId(e.target.value); }}
              className={inp} placeholder="B12345678" />
          </div>
          <div>
            <label className={lbl}>Nº trabajadores</label>
            <input name="num_trabajadores" type="number" defaultValue={colab?.num_trabajadores ?? ""} className={inp} placeholder="10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email de contacto</label>
            <input name="email" defaultValue={colab?.email ?? ""} className={inp} placeholder="info@tuempresa.es" readOnly />
          </div>
          <div>
            <label className={lbl}>Teléfono</label>
            <input name="telefono" defaultValue={colab?.telefono ?? ""} className={inp} placeholder="612 345 678" />
          </div>
        </div>

        <div>
          <label className={lbl}>Web</label>
          <input name="web" defaultValue={colab?.web ?? ""} className={inp} placeholder="https://tuempresa.es" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#2E1A47] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-all disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Guardado correctamente</span>
        )}
      </div>
    </form>
  );
}
