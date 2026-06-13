"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

interface Colab { id: string; nombre: string }

export default function NuevoClienteForm({ colaboradores, onClose }: { colaboradores: Colab[]; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [collaboratorId, setCollaboratorId] = useState("");
  const [nombre, setNombre] = useState("");
  const [cif, setCif] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [web, setWeb] = useState("");
  const [direccion, setDireccion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [cnae, setCnae] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoPuesto, setContactoPuesto] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!collaboratorId || !nombre.trim()) {
      setError("Colaborador y nombre son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collaborator_id: collaboratorId, nombre, cif, email, telefono, web,
        direccion, provincia, cnae,
        contacto_nombre: contactoNombre, contacto_email: contactoEmail,
        contacto_telefono: contactoTelefono, contacto_puesto: contactoPuesto,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear el cliente.");
      return;
    }
    const client = await res.json();
    router.push(`/admin/clientes/${client.id}`);
  }

  return (
    <div className="bg-white border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Nuevo cliente</h2>
        <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-red-500">✕ Cerrar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Colaborador asignado *</label>
          <select value={collaboratorId} onChange={e => setCollaboratorId(e.target.value)} required className={inp}>
            <option value="">— Seleccionar colaborador —</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <EmpresaSearchInput
            value={nombre}
            onChange={setNombre}
            inp={inp}
            labelCls={labelCls}
            onSelect={(data) => {
              setNombre(data.nombre);
              setCif(data.cif);
              if (data.direccion) setDireccion(data.direccion);
              if (data.provincia) setProvincia(data.provincia);
              if (data.cnae) setCnae(data.cnae_label ? `${data.cnae} - ${data.cnae_label}` : data.cnae);
              if (data.telefono) setTelefono(data.telefono);
              if (data.email) setEmail(data.email);
              if (data.web) setWeb(data.web);
            }}
            onCifDuplicate={() => {}}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>CIF</label>
            <input value={cif} onChange={e => setCif(e.target.value)} className={inp} placeholder="B12345678" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="info@empresa.es" />
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input value={direccion} onChange={e => setDireccion(e.target.value)} className={inp} placeholder="Calle, nº, CP, Ciudad" />
          </div>
          <div>
            <label className={labelCls}>Provincia</label>
            <input value={provincia} onChange={e => setProvincia(e.target.value)} className={inp} placeholder="Madrid" />
          </div>
          <div>
            <label className={labelCls}>CNAE</label>
            <input value={cnae} onChange={e => setCnae(e.target.value)} className={inp} placeholder="6201 - Consultoría informática" />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input value={telefono} onChange={e => setTelefono(e.target.value)} className={inp} placeholder="+34 600 000 000" />
          </div>
          <div>
            <label className={labelCls}>Web</label>
            <input value={web} onChange={e => setWeb(e.target.value)} className={inp} placeholder="www.empresa.es" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} className={inp} placeholder="Nombre completo" />
            </div>
            <div>
              <label className={labelCls}>Puesto</label>
              <input value={contactoPuesto} onChange={e => setContactoPuesto(e.target.value)} className={inp} placeholder="Director financiero" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)} className={inp} placeholder="contacto@empresa.es" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={contactoTelefono} onChange={e => setContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-[#2E1A47] text-white text-sm font-bold hover:bg-[#3d2460] transition-colors disabled:opacity-60">
            {loading ? "Creando..." : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
