"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDocId } from "@/lib/format";

interface Props {
  supplier: {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    web: string | null;
    cif: string | null;
    razon_social: string | null;
    logo_url: string | null;
  };
  user: { id: string; nombre: string; email: string } | undefined;
}

export default function SupplierDataForm({ supplier, user }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(supplier.logo_url ?? "");
  const [logoUrl, setLogoUrl] = useState<string>(supplier.logo_url ?? "");
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: supplier.nombre ?? "",
    email: supplier.email ?? "",
    telefono: supplier.telefono ?? "",
    web: supplier.web ?? "",
    cif: supplier.cif ?? "",
    razon_social: supplier.razon_social ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/proveedor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo_url: logoUrl }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <form onSubmit={handleSubmit}>
      {/* Logo */}
      <div className="bg-white border border-gray-200 mb-4">
        <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Logo de la empresa</h3>
        </div>
        <div className="px-5 py-4 flex items-start gap-5">
          <div className="w-20 h-20 bg-[#EEEBF3] flex items-center justify-center overflow-hidden border border-dashed border-[#2E1A47]/30 flex-shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-[#2E1A47]/40 text-center px-2">Sin logo</span>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex border border-gray-200 w-fit">
              <button type="button" onClick={() => setUploadMode("url")}
                className={`px-4 py-1.5 text-xs font-semibold transition-all ${uploadMode === "url" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                URL
              </button>
              <button type="button" onClick={() => { setUploadMode("file"); fileRef.current?.click(); }}
                className={`px-4 py-1.5 text-xs font-semibold border-l border-gray-200 transition-all ${uploadMode === "file" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                Subir archivo
              </button>
            </div>
            {uploadMode === "url" ? (
              <div>
                <label className={labelCls}>URL del logo</label>
                <input value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoPreview(e.target.value); }}
                  className={inputCls} placeholder="https://tuempresa.es/logo.png" />
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  {logoPreview && uploadMode === "file" ? "Cambiar archivo" : "Seleccionar archivo"}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG o SVG. Máx. 2 MB.</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { handleFileChange(e); setUploadMode("file"); }} />
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="bg-white border border-gray-200">
        <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
        {user && (
          <div className="bg-gray-50 border border-gray-100 px-4 py-3 mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tu cuenta</p>
            <p className="text-sm font-medium text-gray-800">{user.nombre}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre comercial</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Razón social</label>
            <input value={form.razon_social} onChange={e => set("razon_social", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CIF</label>
            <input value={form.cif} onChange={e => set("cif", e.target.value)}
              onBlur={e => { const v = formatDocId(e.target.value); set("cif", v); }}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input value={form.telefono} onChange={e => set("telefono", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Web</label>
            <input value={form.web} onChange={e => set("web", e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </button>
        </div>
        </div>
      </div>
    </form>
  );
}
