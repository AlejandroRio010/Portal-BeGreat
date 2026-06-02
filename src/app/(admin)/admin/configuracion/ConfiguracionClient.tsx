"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// ── Sortable fase item ────────────────────────────────────────────────────────
function SortableFase({
  id,
  index,
  value,
  onRename,
  onDelete,
}: {
  id: string;
  index: number;
  value: string;
  onRename: (val: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-gray-200 px-3 py-2.5 group"
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
        title="Arrastrar para reordenar"
      >
        ⠿
      </button>

      {/* Número */}
      <span className="w-5 h-5 flex items-center justify-center bg-[#EEEBF3] text-[#2E1A47] text-[10px] font-bold flex-shrink-0">
        {index + 1}
      </span>

      {/* Nombre editable */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onRename(draft.trim() || value); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onRename(draft.trim() || value); setEditing(false); }
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
          className="flex-1 border border-[#2E1A47] px-2 py-0.5 text-sm focus:outline-none"
        />
      ) : (
        <span
          className="flex-1 text-sm text-gray-800 cursor-pointer hover:text-[#2E1A47]"
          onDoubleClick={() => setEditing(true)}
          title="Doble clic para renombrar"
        >
          {value}
        </span>
      )}

      {/* Botones */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="text-xs text-[#2E1A47] font-semibold hover:underline"
        >
          Renombrar
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-500 font-semibold hover:text-red-700"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Pipeline editor ───────────────────────────────────────────────────────────
function PipelineEditor({
  label,
  pipelineKey,
  initialFases,
}: {
  label: string;
  pipelineKey: "consultoria" | "renting";
  initialFases: string[];
}) {
  const [fases, setFases] = useState(initialFases);
  const [newFase, setNewFase] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = fases.indexOf(String(active.id));
    const newIdx = fases.indexOf(String(over.id));
    setFases(arrayMove(fases, oldIdx, newIdx));
  }

  function handleRename(idx: number, value: string) {
    setFases((prev) => prev.map((f, i) => (i === idx ? value : f)));
  }

  function handleDelete(idx: number) {
    if (!confirm("¿Eliminar esta fase? Las operaciones en esta fase quedarán sin fase reconocida.")) return;
    setFases((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    const trimmed = newFase.trim();
    if (!trimmed || fases.includes(trimmed)) return;
    setFases((prev) => [...prev, trimmed]);
    setNewFase("");
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/admin/pipelines/${pipelineKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fases }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">{label}</p>
        <p className="text-xs text-gray-400">Arrastra para reordenar · Doble clic para renombrar</p>
      </div>

      <div className="px-6 py-4 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fases} strategy={verticalListSortingStrategy}>
            {fases.map((fase, idx) => (
              <SortableFase
                key={fase}
                id={fase}
                index={idx}
                value={fase}
                onRename={(val) => handleRename(idx, val)}
                onDelete={() => handleDelete(idx)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Añadir nueva fase */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 mt-3">
          <input
            value={newFase}
            onChange={(e) => setNewFase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nueva fase..."
            className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#EEEBF3] text-[#2E1A47] text-sm font-semibold hover:bg-[#2E1A47] hover:text-white transition-colors"
          >
            + Añadir
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Guardado ✓</span>}
        <p className="text-xs text-gray-400 ml-auto">Los cambios afectan al kanban inmediatamente</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConfiguracionClient({ initialFields, pipelineConsultoria, pipelineRenting }: Props) {
  const [tab, setTab] = useState<Tab>("campos");
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [etiqueta, setEtiqueta] = useState("");
  const [entidad, setEntidad] = useState<"operacion" | "cliente">("operacion");
  const [tipo, setTipo] = useState<"texto" | "euros" | "porcentaje" | "enlace">("texto");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    if (!etiqueta.trim()) { setAddError("La etiqueta es obligatoria."); return; }
    setAdding(true); setAddError(null);
    const res = await fetch("/api/admin/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etiqueta: etiqueta.trim(), entidad, tipo }),
    });
    if (res.ok) {
      const newField = await res.json();
      setFields((prev) => [...prev, newField]);
      setEtiqueta("");
    } else {
      setAddError("Error al añadir el campo.");
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este campo? Se perderán todos sus valores.")) return;
    const res = await fetch(`/api/admin/custom-fields/${id}`, { method: "DELETE" });
    if (res.ok) setFields((prev) => prev.filter((f) => f.id !== id));
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
              tab === t.key ? "bg-[#2E1A47] text-white" : "bg-white text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Campos personalizados */}
      {tab === "campos" && (
        <div className="space-y-6">
          {Object.keys(groupedFields).length === 0 ? (
            <div className="bg-white border border-gray-200 p-10 text-center">
              <p className="text-sm text-gray-400">No hay campos personalizados todavía.</p>
            </div>
          ) : (
            Object.entries(groupedFields).map(([ent, entFields]) => (
              <div key={ent} className="bg-white border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">{ENTIDAD_LABELS[ent] ?? ent}</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#EEEBF3] border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Etiqueta</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entFields.map((f) => (
                      <tr key={f.id} className="hover:bg-[#EEEBF3]/20">
                        <td className="px-6 py-3 text-sm text-gray-800 font-medium">{f.etiqueta}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{TIPO_LABELS[f.tipo] ?? f.tipo}</td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => handleDelete(f.id)} className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 px-2 py-0.5 hover:bg-red-50 transition-colors">
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

          <div className="bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Añadir campo personalizado</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Etiqueta</label>
                <input type="text" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej: Número de expediente" className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entidad</label>
                  <select value={entidad} onChange={(e) => setEntidad(e.target.value as "operacion" | "cliente")} className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="operacion">Operación</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as "texto" | "euros" | "porcentaje" | "enlace")} className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="texto">Texto</option>
                    <option value="euros">Euros (€)</option>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="enlace">Enlace (URL)</option>
                  </select>
                </div>
              </div>
              {addError && <p className="text-xs text-red-600 font-semibold">{addError}</p>}
              <button onClick={handleAdd} disabled={adding} className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
                {adding ? "Añadiendo..." : "Añadir campo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fases del pipeline */}
      {tab === "fases" && (
        <div className="space-y-6">
          <PipelineEditor label="Consultoría financiera" pipelineKey="consultoria" initialFases={pipelineConsultoria} />
          <PipelineEditor label="Renting de equipos" pipelineKey="renting" initialFases={pipelineRenting} />
        </div>
      )}

      {/* Tab: Colaboradores */}
      {tab === "colaboradores" && (
        <div className="bg-white border border-gray-200 p-10 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">Gestiona los colaboradores del portal desde la sección dedicada.</p>
          <Link href="/admin/colaboradores" className="px-6 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors">
            Ir a Colaboradores →
          </Link>
        </div>
      )}
    </div>
  );
}
