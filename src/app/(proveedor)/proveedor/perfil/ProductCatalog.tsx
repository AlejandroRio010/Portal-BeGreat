"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  precio_venta: string | null;
  activo: boolean;
}

export default function ProductCatalog({ products }: { products: Product[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", tipo: "industrial", precio_venta: "" });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      tipo: p.tipo ?? "industrial",
      precio_venta: p.precio_venta ?? "",
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditId(null);
    setForm({ nombre: "", descripcion: "", tipo: "industrial", precio_venta: "" });
    setShowForm(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const url = editId ? `/api/proveedor/products/${editId}` : "/api/proveedor/products";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          tipo: form.tipo || null,
          precio_venta: form.precio_venta || null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(id: string, activo: boolean) {
    await fetch(`/api/proveedor/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    });
    router.refresh();
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Catálogo de productos</h3>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="text-[10px] font-bold text-[#2E1A47] border border-[#2E1A47]/30 px-2.5 py-1 hover:bg-[#2E1A47] hover:text-white transition-colors uppercase tracking-wider">
            + Nuevo producto
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-gray-200 space-y-3 bg-gray-50/50">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {editId ? "Editar producto" : "Nuevo producto"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input value={form.nombre} onChange={e => set("nombre", e.target.value)} className={inputCls} placeholder="Nombre del producto" />
            </div>
            <div>
              <label className={labelCls}>Precio venta (sin IVA)</label>
              <input type="number" step="0.01" value={form.precio_venta} onChange={e => set("precio_venta", e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tipo de equipo</label>
            <div className="grid grid-cols-2 gap-0 border border-gray-200">
              {(["industrial", "tecnologico"] as const).map((val, i) => (
                <button key={val} type="button" onClick={() => set("tipo", val)}
                  className={`py-2 text-xs font-semibold transition-all ${i > 0 ? "border-l border-gray-200" : ""} ${
                    form.tipo === val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  {val === "industrial" ? "Industrial" : "Tecnológico"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Descripción del producto..." />
          </div>
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Crear producto"}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {products.length === 0 && !showForm && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No hay productos en el catálogo</p>
        )}
        {products.map(p => (
          <div key={p.id} className={`px-5 py-3 flex items-center justify-between ${!p.activo ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                {p.tipo && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                    p.tipo === "tecnologico" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {p.tipo === "tecnologico" ? "Tecnológico" : "Industrial"}
                  </span>
                )}
                {!p.activo && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-50 text-red-500">Inactivo</span>}
              </div>
              {p.descripcion && <p className="text-xs text-gray-400 truncate mt-0.5">{p.descripcion}</p>}
            </div>
            <div className="flex items-center gap-3 ml-4">
              {p.precio_venta && <span className="text-sm font-bold text-gray-700">{Number(p.precio_venta).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>}
              <button onClick={() => toggleActivo(p.id, p.activo)}
                className={`text-[10px] font-semibold px-2 py-1 border transition-colors ${
                  p.activo ? "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                }`}>
                {p.activo ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => startEdit(p)}
                className="text-[10px] font-semibold text-[#2E1A47] border border-[#2E1A47]/30 px-2 py-1 hover:bg-[#EEEBF3] transition-colors">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
