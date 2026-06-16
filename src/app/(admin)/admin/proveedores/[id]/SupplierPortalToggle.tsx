"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  supplierId: string;
  portalActivo: boolean;
  puedeVerEntidades: boolean;
}

export default function SupplierPortalToggle({ supplierId, portalActivo, puedeVerEntidades }: Props) {
  const router = useRouter();
  const [portal, setPortal] = useState(portalActivo);
  const [entidades, setEntidades] = useState(puedeVerEntidades);
  const [saving, setSaving] = useState(false);

  async function toggle(field: "portal_activo" | "puede_ver_entidades", value: boolean) {
    setSaving(true);
    const res = await fetch(`/api/admin/proveedores/${supplierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      if (field === "portal_activo") setPortal(value);
      else setEntidades(value);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Acceso al portal</h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-800">Portal de proveedor</p>
            <p className="text-xs text-gray-400 mt-0.5">Permite al proveedor acceder a su portal</p>
          </div>
          <button
            onClick={() => toggle("portal_activo", !portal)}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors ${portal ? "bg-[#2E1A47]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${portal ? "translate-x-5" : ""}`} />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-800">Ver entidades financieras</p>
            <p className="text-xs text-gray-400 mt-0.5">Muestra la entidad que estudia y destino en las operaciones</p>
          </div>
          <button
            onClick={() => toggle("puede_ver_entidades", !entidades)}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors ${entidades ? "bg-[#2E1A47]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${entidades ? "translate-x-5" : ""}`} />
          </button>
        </label>
      </div>
    </div>
  );
}
