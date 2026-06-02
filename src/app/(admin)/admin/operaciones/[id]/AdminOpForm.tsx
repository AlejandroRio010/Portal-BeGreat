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

interface CustomField {
  id: string;
  etiqueta: string;
  tipo: string;
  orden: number;
}

interface CustomFieldValue {
  field_id: string;
  valor: string | null;
}

interface Props {
  opId: string;
  pipelineKey: string;
  initialFase: string;
  initialStatus: string;
  initialComisionColab: string | null;
  initialComisionBegreat: string | null;
  initialEntidad: string | null;
  initialHonorarios: boolean | null;
  initialNotasAdmin: string | null;
  initialFacturacionRenting: string | null;
  initialOnedriveUrl: string | null;
  customFieldDefs?: CustomField[];
  customFieldValues?: CustomFieldValue[];
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
  initialNotasAdmin,
  initialFacturacionRenting,
  initialOnedriveUrl,
}: Props) {
  const router = useRouter();
  const fases = pipelineKey === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;

  const [fase, setFase] = useState(initialFase);
  const [status, setStatus] = useState(initialStatus);
  const [comisionColab, setComisionColab] = useState(initialComisionColab ?? "");
  const [comisionBegreat, setComisionBegreat] = useState(initialComisionBegreat ?? "");
  const [entidad, setEntidad] = useState(initialEntidad ?? "");
  const [honorarios, setHonorarios] = useState(initialHonorarios ?? false);
  const [notasAdmin, setNotasAdmin] = useState(initialNotasAdmin ?? "");
  const [facturacionRenting, setFacturacionRenting] = useState(initialFacturacionRenting ?? "");
  const [onedriveUrl, setOnedriveUrl] = useState(initialOnedriveUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saving notas admin separately
  const [savingNotas, setSavingNotas] = useState(false);
  const [savedNotas, setSavedNotas] = useState(false);

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
          facturacion_renting: facturacionRenting || null,
          onedrive_url: onedriveUrl || null,
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

  async function handleSaveNotas() {
    setSavingNotas(true);
    setSavedNotas(false);
    try {
      const res = await fetch(`/api/admin/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas_admin: notasAdmin || null }),
      });
      if (!res.ok) throw new Error("Error");
      setSavedNotas(true);
      router.refresh();
    } catch {
      setError("Error al guardar las notas.");
    } finally {
      setSavingNotas(false);
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
    <>
      {/* Main admin form */}
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

        {/* Modalidad facturación renting */}
        {pipelineKey === "renting" && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">Modalidad de facturación</label>
              <span className="text-[10px] bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 font-semibold">Solo admin</span>
            </div>
            <select
              value={facturacionRenting}
              onChange={(e) => setFacturacionRenting(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]"
            >
              <option value="">Sin especificar</option>
              <option value="begreat">BeGreat factura y paga al proveedor</option>
              <option value="financiera">La financiera paga directamente al proveedor (solo comisionamos)</option>
            </select>
          </div>
        )}

        {/* OneDrive URL */}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">📁 Enlace documentación (OneDrive)</label>
          <input
            type="text"
            value={onedriveUrl}
            onChange={(e) => setOnedriveUrl(e.target.value)}
            placeholder="https://onedrive.live.com/..."
            className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
          />
          {onedriveUrl && (
            <a
              href={onedriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1.5 text-xs text-[#2E1A47] hover:underline truncate"
            >
              Abrir enlace →
            </a>
          )}
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

      {/* Notas internas (solo admin) */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Notas internas</p>
          <span className="text-[10px] bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 font-semibold">Solo admin</span>
        </div>
        <textarea
          value={notasAdmin}
          onChange={(e) => setNotasAdmin(e.target.value)}
          rows={4}
          placeholder="Notas internas solo visibles por administradores..."
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47] resize-none"
        />
        <button
          onClick={handleSaveNotas}
          disabled={savingNotas}
          className="w-full py-2 border border-[#2E1A47] text-[#2E1A47] text-sm font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50"
        >
          {savingNotas ? "Guardando..." : "Guardar notas internas"}
        </button>
        {savedNotas && (
          <p className="text-xs text-emerald-600 font-semibold text-center">Notas guardadas.</p>
        )}
      </div>
    </>
  );
}
