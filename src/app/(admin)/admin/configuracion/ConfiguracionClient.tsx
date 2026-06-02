"use client";

import { useState } from "react";
import Link from "next/link";

interface CustomField {
  id: string;
  entidad: string;
  etiqueta: string;
  tipo: string;
  orden: number;
}

interface Props {
  initialFields: CustomField[];
  pipelineConsultoria: string[];
  pipelineRenting: string[];
}

type Tab = "campos" | "fases" | "colaboradores";

const TIPO_LABELS: Record<string, string> = {
  texto: "Texto",
  euros: "Euros (€)",
  porcentaje: "Porcentaje (%)",
  enlace: "Enlace (URL)",
};

const ENTIDAD_LABELS: Record<string, string> = {
  operacion: "Operación",
  cliente: "Cliente",
};

export default function ConfiguracionClient({ initialFields, pipelineConsultoria, pipelineRenting }: Props) {
  const [tab, setTab] = useState<Tab>("campos");
  const [fields, setFields] = useState<CustomField[]>(initialFields);

  // Form state
  const [etiqueta, setEtiqueta] = useState("");
  const [entidad, setEntidad] = useState<"operacion" | "cliente">("operacion");
  const [tipo, setTipo] = useState<"texto" | "euros" | "porcentaje" | "enlace">("texto");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    if (!etiqueta.trim()) { setAddError("La etiqueta es obligatoria."); return; }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etiqueta: etiqueta.trim(), entidad, tipo }),
      });
      if (!res.ok) throw new Error("Error al añadir");
      const newField = await res.json();
      setFields((prev) => [...prev, newField]);
      setEtiqueta("");
    } catch {
      setAddError("Error al añadir el campo.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este campo? Se perderán todos sus valores.")) return;
    try {
      const res = await fetch(`/api/admin/custom-fields/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFields((prev) => prev.filter((f) => f.id !== id));
    } catch {
      alert("Error al eliminar el campo.");
    }
  }

  const groupedFields = fields.reduce<Record<string, CustomField[]>>((acc, f) => {
    if (!acc[f.entidad]) acc[f.entidad] = [];
    acc[f.entidad].push(f);
    return acc;
  }, {});

  const tabs: { key: Tab; label: string }[] = [
    { key: "campos", label: "Campos personalizados" },
    { key: "fases", label: "Fases del pipeline" },
    { key: "colaboradores", label: "Colaboradores" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-400 mt-1">Ajustes del portal</p>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "bg-[#2E1A47] text-white"
                : "bg-white text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Campos personalizados */}
      {tab === "campos" && (
        <div className="space-y-6">
          {/* Existing fields grouped by entity */}
          {Object.keys(groupedFields).length === 0 ? (
            <div className="bg-white border border-gray-200 p-10 text-center">
              <p className="text-sm text-gray-400">No hay campos personalizados todavía.</p>
            </div>
          ) : (
            Object.entries(groupedFields).map(([ent, entFields]) => (
              <div key={ent} className="bg-white border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">
                    {ENTIDAD_LABELS[ent] ?? ent}
                  </p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#EEEBF3] border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Etiqueta</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Orden</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entFields.map((f) => (
                      <tr key={f.id} className="hover:bg-[#EEEBF3]/20">
                        <td className="px-6 py-3 text-sm text-gray-800 font-medium">{f.etiqueta}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{TIPO_LABELS[f.tipo] ?? f.tipo}</td>
                        <td className="px-6 py-3 text-sm text-gray-400">{f.orden}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 px-2 py-0.5 hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          {/* Add field form */}
          <div className="bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Añadir campo personalizado</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Etiqueta</label>
                <input
                  type="text"
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  placeholder="Ej: Número de expediente"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entidad</label>
                  <select
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value as "operacion" | "cliente")}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]"
                  >
                    <option value="operacion">Operación</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as "texto" | "euros" | "porcentaje" | "enlace")}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]"
                  >
                    <option value="texto">Texto</option>
                    <option value="euros">Euros (€)</option>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="enlace">Enlace (URL)</option>
                  </select>
                </div>
              </div>
              {addError && <p className="text-xs text-red-600 font-semibold">{addError}</p>}
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
              >
                {adding ? "Añadiendo..." : "Añadir campo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fases del pipeline */}
      {tab === "fases" && (
        <div className="space-y-6">
          {[
            { label: "Consultoría financiera", fases: pipelineConsultoria },
            { label: "Renting de equipos", fases: pipelineRenting },
          ].map(({ label, fases }) => (
            <div key={label} className="bg-white border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">{label}</p>
              </div>
              <div className="px-6 py-5">
                <ol className="space-y-2">
                  {fases.map((fase, i) => (
                    <li key={fase} className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#EEEBF3] text-[#2E1A47] text-[10px] font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700">{fase}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-4">
                  Para reordenar fases contacta con soporte técnico.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Colaboradores */}
      {tab === "colaboradores" && (
        <div className="bg-white border border-gray-200 p-10 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">Gestiona los colaboradores del portal desde la sección dedicada.</p>
          <Link
            href="/admin/colaboradores"
            className="px-6 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors"
          >
            Ir a Colaboradores →
          </Link>
        </div>
      )}
    </div>
  );
}
