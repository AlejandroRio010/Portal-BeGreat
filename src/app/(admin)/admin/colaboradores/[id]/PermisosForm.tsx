"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  colaboradorId: string;
  puedeEditarOps: boolean;
  nivelEntidades: number;
  puedePublicarSinValidar: boolean;
}

const NIVELES_ENTIDADES = [
  { value: 1, label: "Nivel 1 — Acceso completo", desc: "Ve todo, puede crear entidades/oficinas/contactos (solo edita lo que él creó)." },
  { value: 2, label: "Nivel 2 — Solo lectura", desc: "Ve nombre de entidad y nº oficinas, sin contactos ni detalle de oficinas." },
  { value: 3, label: "Nivel 3 — Solo en operaciones", desc: "Sin sección en sidebar. Ve oficina/broker en sus operaciones como texto plano." },
  { value: 4, label: "Nivel 4 — Mínimo", desc: "Sin sección. Solo ve nombre del banco en sus ops (sin oficina). Se puede ocultar el nombre." },
];

export default function PermisosForm({ colaboradorId, puedeEditarOps, nivelEntidades, puedePublicarSinValidar }: Props) {
  const router = useRouter();
  const [editarOps, setEditarOps] = useState(puedeEditarOps);
  const [nivel, setNivel] = useState(nivelEntidades);
  const [publicarSinValidar, setPublicarSinValidar] = useState(puedePublicarSinValidar);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(field: string, value: unknown) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/colaboradores/${colaboradorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleBool(field: string, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    setter(next);
    save(field, next);
  }

  function changeNivel(v: number) {
    setNivel(v);
    save("nivel_entidades", v);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Permisos especiales</h3>
        {saving && <span className="text-[10px] text-gray-400">Guardando...</span>}
        {saved && <span className="text-[10px] text-emerald-600 font-semibold">Guardado ✓</span>}
      </div>
      <div className="px-5 py-4 space-y-4">

        {/* Puede editar ops */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Puede editar operaciones y clientes</p>
            <p className="text-xs text-gray-400 mt-0.5">Permite al colaborador editar los datos de sus propias operaciones y clientes, y añadir personas de contacto.</p>
          </div>
          <button
            onClick={() => toggleBool("puede_editar_ops", editarOps, setEditarOps)}
            disabled={saving}
            className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 ${
              editarOps ? "bg-[#2E1A47]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 bg-white transition-transform ${
                editarOps ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Nivel entidades */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Nivel de acceso a entidades financieras</p>
          <p className="text-xs text-gray-400 mb-3">Controla qué información de entidades financieras ve este colaborador.</p>
          <div className="space-y-2">
            {NIVELES_ENTIDADES.map((n) => (
              <button
                key={n.value}
                onClick={() => changeNivel(n.value)}
                disabled={saving}
                className={`w-full text-left px-4 py-3 border transition-colors disabled:opacity-50 ${
                  nivel === n.value
                    ? "border-[#2E1A47] bg-[#EEEBF3]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-semibold ${nivel === n.value ? "text-[#2E1A47]" : "text-gray-700"}`}>{n.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Puede publicar sin validar */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Publicar operaciones sin validación</p>
            <p className="text-xs text-gray-400 mt-0.5">Las operaciones que suba este colaborador se activan directamente sin pasar por "Pendiente de validar". Solo para colaboradores de confianza.</p>
          </div>
          <button
            onClick={() => toggleBool("puede_publicar_sin_validar", publicarSinValidar, setPublicarSinValidar)}
            disabled={saving}
            className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 ${
              publicarSinValidar ? "bg-[#2E1A47]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 bg-white transition-transform ${
                publicarSinValidar ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

      </div>
    </div>
  );
}
