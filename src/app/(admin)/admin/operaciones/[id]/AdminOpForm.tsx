"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FASES_CONSULTORIA = [
  "Pre-análisis",
  "Firma de honorarios",
  "En estudio por entidad",
  "Operación aprobada",
  "Contrato firmado",
  "Honorarios pagados",
];

const FASES_RENTING = [
  "Pre-análisis",
  "En estudio por entidad",
  "Operación aprobada",
  "Condiciones aceptadas",
  "Contrato firmado",
  "Transferencia realizada",
];

interface Props {
  opId: string;
  pipelineKey: string;
  initialFase: string;
  initialStatus: string;
  initialComisionColab: string | null;
  initialComisionBegreat: string | null;
  initialEntidad: string | null;
  initialHonorarios: boolean | null;
}

export default function AdminOpForm({
  opId,
  pipelineKey,
  initialFase,
  initialStatus,
  initialComisionColab,
  initialComisionBegreat,
  initialEntidad,
  initialHonorarios,
}: Props) {
  const router = useRouter();
  const fases = pipelineKey === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;

  const [fase, setFase] = useState(initialFase);
  const [status, setStatus] = useState(initialStatus);
  const [comisionColab, setComisionColab] = useState(initialComisionColab ?? "");
  const [comisionBegreat, setComisionBegreat] = useState(initialComisionBegreat ?? "");
  const [entidad, setEntidad] = useState(initialEntidad ?? "");
  const [honorarios, setHonorarios] = useState(initialHonorarios ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fase,
          status,
          comision_colaborador: comisionColab || null,
          comision_begreat: comisionBegreat || null,
          entidad_financiera: entidad || null,
          honorarios_firmado: honorarios,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(newStatus: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Error");
      setStatus(newStatus);
      router.refresh();
    } catch {
      setError("Error al cambiar el estado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-5 space-y-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest pb-3 border-b border-gray-100">
        Gestión admin
      </p>

      {/* Status actions */}
      {status === "pendiente_de_validar" && (
        <div className="flex gap-3">
          <button
            onClick={() => handleStatus("activa")}
            disabled={saving}
            className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Aprobar →
          </button>
          <button
            onClick={() => handleStatus("archivada")}
            disabled={saving}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Archivar
          </button>
        </div>
      )}
      {status === "activa" && (
        <div className="flex gap-3">
          <button
            onClick={() => handleStatus("archivada")}
            disabled={saving}
            className="flex-1 py-2 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Archivar
          </button>
        </div>
      )}
      {status === "archivada" && (
        <div>
          <button
            onClick={() => handleStatus("activa")}
            disabled={saving}
            className="w-full py-2 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Reactivar
          </button>
        </div>
      )}

      {/* Fase */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fase</label>
        <select
          value={fase}
          onChange={(e) => setFase(e.target.value)}
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]"
        >
          {fases.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Fee colaborador */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fee colaborador (€)</label>
        <input
          type="number"
          step="0.01"
          value={comisionColab}
          onChange={(e) => setComisionColab(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
        />
      </div>

      {/* Fee BeGreat */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fee BeGreat (€)</label>
        <input
          type="number"
          step="0.01"
          value={comisionBegreat}
          onChange={(e) => setComisionBegreat(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
        />
      </div>

      {/* Entidad financiera */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entidad financiera</label>
        <input
          type="text"
          value={entidad}
          onChange={(e) => setEntidad(e.target.value)}
          placeholder="Banco Santander, BBVA..."
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
        />
      </div>

      {/* Honorarios firmados */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="honorarios"
          checked={honorarios}
          onChange={(e) => setHonorarios(e.target.checked)}
          className="w-4 h-4 accent-[#2E1A47]"
        />
        <label htmlFor="honorarios" className="text-sm text-gray-700 cursor-pointer">
          Honorarios firmados
        </label>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>

      {saved && (
        <p className="text-xs text-emerald-600 font-semibold text-center">Cambios guardados correctamente.</p>
      )}
      {error && (
        <p className="text-xs text-red-600 font-semibold text-center">{error}</p>
      )}
    </div>
  );
}
