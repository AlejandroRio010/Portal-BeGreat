"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";

const inp = "w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function NuevoProveedorModal({ colaboradores }: { colaboradores: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [web, setWeb] = useState("");
  const [cif, setCif] = useState("");
  const [cnae, setCnae] = useState("");
  const [direccion, setDireccion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");

  function resetFields() {
    setNombre(""); setEmail(""); setTelefono(""); setWeb(""); setCif(""); setCnae(""); setDireccion(""); setProvincia(""); setNombreComercial(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data = {
      nombre: nombre.trim(),
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      web: web.trim() || null,
      cif: cif.trim() || null,
      cnae: cnae.trim() || null,
      direccion: direccion.trim() || null,
      provincia: provincia.trim() || null,
      nombre_comercial: nombreComercial.trim() || null,
      persona_contacto: (form.get("persona_contacto") as string)?.trim() || null,
      contacto_email: (form.get("contacto_email") as string)?.trim() || null,
      contacto_telefono: (form.get("contacto_telefono") as string)?.trim() || null,
      collaborator_id: (form.get("collaborator_id") as string) || null,
    };

    if (!data.nombre) { setError("El nombre es obligatorio"); setLoading(false); return; }

    const res = await fetch("/api/admin/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear proveedor");
      setLoading(false);
      return;
    }

    const prov = await res.json();
    setOpen(false);
    resetFields();
    router.push(`/admin/proveedores/${prov.id}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => { resetFields(); setOpen(true); }}
        className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors">
        + Nuevo proveedor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#2E1A47] px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider">Nuevo proveedor</h2>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <EmpresaSearchInput
                value={nombre}
                onChange={setNombre}
                inp={inp}
                labelCls={lbl}
                onSelect={(data) => {
                  setNombre(data.nombre);
                  if (data.telefono) setTelefono(data.telefono);
                  if (data.email) setEmail(data.email);
                  if (data.web) setWeb(data.web);
                  if (data.cif) setCif(data.cif);
                  if (data.cnae) setCnae(data.cnae);
                  if (data.direccion) setDireccion(data.direccion);
                  if (data.provincia) setProvincia(data.provincia);
                }}
                onCifDuplicate={() => {}}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>CIF</label>
                  <input value={cif} onChange={e => setCif(e.target.value)} className={inp} placeholder="B12345678" />
                </div>
                <div>
                  <label className={lbl}>Nombre comercial</label>
                  <input value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} className={inp} placeholder="Nombre comercial" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className={lbl}>Teléfono</label>
                  <input value={telefono} onChange={e => setTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
              </div>

              <div>
                <label className={lbl}>Web</label>
                <input value={web} onChange={e => setWeb(e.target.value)} className={inp} placeholder="https://www.empresa.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>CNAE</label>
                  <input value={cnae} onChange={e => setCnae(e.target.value)} className={inp} placeholder="4511" />
                </div>
                <div>
                  <label className={lbl}>Provincia</label>
                  <input value={provincia} onChange={e => setProvincia(e.target.value)} className={inp} placeholder="Madrid" />
                </div>
              </div>

              <div>
                <label className={lbl}>Dirección</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)} className={inp} placeholder="Calle, número, CP, ciudad" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>Nombre</label>
                    <input name="persona_contacto" className={inp} placeholder="Nombre y apellidos" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Email contacto</label>
                      <input name="contacto_email" type="email" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Teléfono contacto</label>
                      <input name="contacto_telefono" className={inp} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className={lbl}>Colaborador asignado</label>
                <select name="collaborator_id" className={inp}>
                  <option value="">Sin asignar</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
                  {loading ? "Creando…" : "Crear proveedor"}
                </button>
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
