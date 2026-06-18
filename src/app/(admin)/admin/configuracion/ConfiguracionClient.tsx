"use client";

import { useState, useEffect, useCallback } from "react";
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

interface UserRow {
  id: string;
  nombre: string;
  email: string;
  role: "admin" | "colaborador";
  activo: boolean;
  identificador: string;
  created_at: Date;
}

interface Props {
  initialFields: CustomField[];
  pipelineConsultoria: string[];
  pipelineRenting: string[];
  initialUsers: UserRow[];
}

type Tab = "campos" | "fases" | "usuarios" | "cotizador" | "documentacion";

const TIPO_LABELS: Record<string, string> = {
  texto: "Texto",
  euros: "Euros (€)",
  porcentaje: "Porcentaje (%)",
  enlace: "Enlace (URL)",
};

const ENTIDAD_LABELS: Record<string, string> = {
  operacion:          "Operación",
  cliente:            "Cliente",
  proveedor:          "Proveedor",
  colaborador:        "Colaborador",
  entidad_financiera: "Entidad financiera",
  oficina:            "Oficina de entidad",
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
// ── Nuevo usuario form ────────────────────────────────────────────────────────
function NuevoUsuarioForm({ onCreated }: { onCreated: (user: UserRow) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [tipoColaborador, setTipoColaborador] = useState<"autonomo" | "empresa">("empresa");
  const [role, setRole] = useState<"colaborador" | "admin">("colaborador");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    const data = {
      nombre: form.get("nombre"),
      email: form.get("email"),
      password: form.get("password"),
      role,
      tipo_colaborador: tipoColaborador,
      nombre_comercial: form.get("nombre_comercial") || null,
      razon_social: form.get("razon_social") || null,
      cif: form.get("cif") || null,
      telefono: form.get("telefono") || null,
      web: form.get("web") || null,
    };

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear el usuario");
    } else {
      const newUser = await res.json();
      onCreated(newUser);
      setSuccess(`${newUser.nombre} dado de alta. Identificador: ${newUser.identificador}`);
      (e.target as HTMLFormElement).reset();
      setTipoColaborador("empresa");
    }
  }

  const inp = "w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="bg-white border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Dar de alta nuevo colaborador</p>
        <p className="text-xs text-gray-400 mt-0.5">Se creará la empresa/autónomo y su primer usuario de acceso</p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Persona de contacto */}
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Persona de contacto</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Nombre completo *</label>
            <input name="nombre" required className={inp} placeholder="Josué Martínez" />
          </div>
          <div>
            <label className={lbl}>Email (login) *</label>
            <input name="email" type="email" required className={inp} placeholder="josue@empresa.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Contraseña *</label>
            <div className="relative">
              <input name="password" type={showPass ? "text" : "password"} required minLength={8} className={inp + " pr-16"} placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Rol *</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className={inp}>
              <option value="colaborador">Colaborador</option>
              <option value="admin">Admin (acceso total)</option>
            </select>
          </div>
        </div>

        {/* Datos empresa / autónomo */}
        {role === "colaborador" && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo de colaborador</p>
              <div className="flex border border-gray-200 ml-2">
                <button
                  type="button"
                  onClick={() => setTipoColaborador("autonomo")}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${tipoColaborador === "autonomo" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Autónomo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoColaborador("empresa")}
                  className={`px-4 py-1.5 text-xs font-semibold border-l border-gray-200 transition-all ${tipoColaborador === "empresa" ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  Empresa
                </button>
              </div>
            </div>

            {tipoColaborador === "autonomo" && (
              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-2">
                Se usará el nombre de la persona como identificador del colaborador.
              </p>
            )}

            <div>
              <label className={lbl}>Razón social {tipoColaborador === "empresa" ? "*" : ""}</label>
              <input name="razon_social" required={tipoColaborador === "empresa"} className={inp} placeholder={tipoColaborador === "autonomo" ? "Nombre completo del autónomo" : "BirdCapital S.L."} />
            </div>

            <div>
              <label className={lbl}>Nombre comercial <span className="text-gray-300 font-normal normal-case">(opcional — si se rellena, se usará como nombre visible)</span></label>
              <input name="nombre_comercial" className={inp} placeholder="BirdCapital" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>CIF</label>
                <input name="cif" className={inp} placeholder="B12345678" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Teléfono</label>
                <input name="telefono" className={inp} placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className={lbl}>Web</label>
                <input name="web" className={inp} placeholder="https://empresa.com" />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-2">{success}</p>}
        <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
          {loading ? "Creando..." : "Dar de alta"}
        </button>
      </form>
    </div>
  );
}

export default function ConfiguracionClient({ initialFields, pipelineConsultoria, pipelineRenting, initialUsers }: Props) {
  const [tab, setTab] = useState<Tab>("campos");
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [etiqueta, setEtiqueta] = useState("");
  const [entidad, setEntidad] = useState<string>("operacion");
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
    { key: "usuarios", label: "Usuarios y accesos" },
    { key: "cotizador", label: "Cotizador" },
    { key: "documentacion", label: "Documentación" },
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

          {/* ── Cuadro de lógica de códigos ── */}
          <div className="bg-white border border-gray-200">
            <div className="bg-[#2E1A47] px-6 py-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Sistema de códigos — Lógica</h3>
              <p className="text-white/60 text-xs mt-1">Referencia para el equipo interno. Los códigos se generan automáticamente al crear cada registro.</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-6">
              {[
                { tipo: "Colaborador", prefijo: "COL", ejemplo: "COL-001", desc: "Secuencial global. Cada colaborador dado de alta recibe el siguiente número disponible." },
                { tipo: "Cliente", prefijo: "CLI", ejemplo: "CLI-042", desc: "Secuencial global. Se asigna al crear el cliente por primera vez." },
                { tipo: "Proveedor", prefijo: "PRV", ejemplo: "PRV-003", desc: "Secuencial global. Se asigna al dar de alta el proveedor." },
                { tipo: "Operación", prefijo: "OP", ejemplo: "OP-042-01", desc: "OP + número de cliente + nº de op de ese cliente. La segunda op del CLI-042 sería OP-042-02." },
              ].map(({ tipo, prefijo, ejemplo, desc }) => (
                <div key={tipo} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="inline-block font-mono font-bold text-sm bg-[#EEEBF3] text-[#2E1A47] px-3 py-1.5 tracking-widest">{ejemplo}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-0.5">{tipo}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5 pt-0">
              <div className="bg-[#EEEBF3] px-4 py-3">
                <p className="text-xs text-[#2E1A47] font-semibold">Ejemplo real:</p>
                <p className="text-xs text-gray-600 mt-1">
                  El colaborador María García es <span className="font-mono font-bold text-[#2E1A47]">COL-001</span>.
                  Da de alta a Empresa Martínez → <span className="font-mono font-bold text-[#2E1A47]">CLI-008</span>.
                  Crea una op de consultoría → <span className="font-mono font-bold text-[#2E1A47]">OP-008-01</span>.
                  Crea otra op para el mismo cliente → <span className="font-mono font-bold text-[#2E1A47]">OP-008-02</span>.
                </p>
              </div>
            </div>
          </div>
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
                  <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="operacion">Operación</option>
                    <option value="cliente">Cliente</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="colaborador">Colaborador</option>
                    <option value="entidad_financiera">Entidad financiera</option>
                    <option value="oficina">Oficina de entidad</option>
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

      {/* Tab: Usuarios y accesos */}
      {tab === "usuarios" && (
        <div className="space-y-6">
          {/* Tabla de usuarios existentes */}
          <div className="bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Usuarios del portal</p>
              <p className="text-xs text-gray-400">{users.length} usuarios</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-[#EEEBF3] border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Rol</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Identificador</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Miembro desde</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#EEEBF3]/20 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{u.nombre}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        u.role === "admin"
                          ? "bg-[#2E1A47] text-white"
                          : "bg-[#EEEBF3] text-[#2E1A47]"
                      }`}>
                        {u.role === "admin" ? "Admin" : "Colaborador"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${
                        u.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"
                      }`}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{u.identificador}</td>
                    <td className="px-6 py-3.5 text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3.5">
                      {u.role === "colaborador" && (
                        <Link href={`/admin/colaboradores/${u.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">
                          Ver ficha →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Crear nuevo usuario */}
          <NuevoUsuarioForm
            onCreated={(u) => setUsers((prev) => [...prev, u])}
          />
        </div>
      )}

      {tab === "cotizador" && <CotizadorDealsPanel />}

      {tab === "documentacion" && <DocTemplatesPanel />}
    </div>
  );
}

// ── Cotizador deals panel ─────────────────────────────────────────────────────

interface CotDeal {
  id: string;
  entidad: string;
  cliente: string;
  importe: string;
  cuota: string;
  plazo_meses: number;
  created_at: string;
}

const ENTIDAD_NAMES: Record<string, string> = {
  grenke: "Grenke",
  laboral_kutxa: "Laboral Kutxa",
};

function CotizadorDealsPanel() {
  const [deals, setDeals] = useState<CotDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [entidad, setEntidad] = useState("");
  const [cliente, setCliente] = useState("");
  const [importe, setImporte] = useState("");
  const [cuota, setCuota] = useState("");
  const [plazo, setPlazo] = useState("60");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/cotizador-deals");
    if (res.ok) setDeals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!entidad || !cliente.trim() || !importe || !cuota || !plazo) return;
    setAdding(true);
    const res = await fetch("/api/admin/cotizador-deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entidad, cliente: cliente.trim(), importe: Number(importe), cuota: Number(cuota), plazo_meses: Number(plazo) }),
    });
    if (res.ok) {
      setCliente(""); setImporte(""); setCuota(""); setPlazo("60");
      load();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta operación de referencia?")) return;
    const res = await fetch("/api/admin/cotizador-deals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setDeals(prev => prev.filter(d => d.id !== id));
  }

  const grouped = deals.reduce<Record<string, CotDeal[]>>((acc, d) => {
    if (!acc[d.entidad]) acc[d.entidad] = [];
    acc[d.entidad].push(d);
    return acc;
  }, {});

  const fmt = (n: string | number) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>;

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([ent, entDeals]) => (
        <div key={ent} className="bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">{ENTIDAD_NAMES[ent] ?? ent}</p>
            <p className="text-xs text-gray-400">{entDeals.length} operaciones</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cuota</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Plazo</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entDeals.map(d => (
                <tr key={d.id} className="hover:bg-[#EEEBF3]/20 transition-colors">
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">{d.cliente}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right tabular-nums">{fmt(d.importe)} €</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right tabular-nums">{fmt(d.cuota)} €</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{d.plazo_meses}m</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-400">No hay operaciones de referencia todavía.</p>
        </div>
      )}

      {/* Añadir nueva */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Añadir operación de referencia</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Entidad</label>
            <select value={entidad} onChange={e => setEntidad(e.target.value)} className={inp}>
              <option value="">Seleccionar</option>
              <option value="grenke">Grenke</option>
              <option value="laboral_kutxa">Laboral Kutxa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cliente</label>
            <input value={cliente} onChange={e => setCliente(e.target.value)} className={inp} placeholder="Nombre empresa" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Importe €</label>
            <input value={importe} onChange={e => setImporte(e.target.value)} type="number" step="any" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cuota €/mes</label>
            <input value={cuota} onChange={e => setCuota(e.target.value)} type="number" step="any" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Plazo (meses)</label>
            <select value={plazo} onChange={e => setPlazo(e.target.value)} className={inp}>
              {[24, 36, 48, 60, 72].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={adding || !entidad || !cliente.trim() || !importe || !cuota}
            className="px-5 py-2.5 bg-[#2E1A47] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3d2560] disabled:opacity-40 transition-colors">
            {adding ? "Añadiendo..." : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Doc checklist templates panel ────────────────────────────────────────────

const TIPO_DOC_LABELS: Record<string, string> = {
  simple: "Simple (check)",
  anual: "Con años",
  trimestral: "Trimestral",
};

function DocTemplatesPanel() {
  const [templates, setTemplates] = useState<{ id: string; nombre: string; tipo: string; orden: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"simple" | "anual" | "trimestral">("simple");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/admin/doc-checklist-templates").then(r => r.json()).then(d => { setTemplates(d); setLoading(false); });
  }, []);

  async function handleAdd() {
    if (!nombre.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/doc-checklist-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), tipo }),
    });
    if (res.ok) {
      const t = await res.json();
      setTemplates(prev => [...prev, t]);
      setNombre("");
      setTipo("simple");
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/admin/doc-checklist-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200">
        <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Documentos requeridos (globales)</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Estos items aparecen automáticamente en todas las fichas de clientes, proveedores y avalistas.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 group hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{t.nombre}</p>
                <p className="text-[10px] text-gray-400">{TIPO_DOC_LABELS[t.tipo] ?? t.tipo}</p>
              </div>
              <button onClick={() => handleDelete(t.id)}
                className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 px-5 py-4 space-y-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Añadir nuevo documento</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Nombre del documento..."
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
                onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <select value={tipo} onChange={e => setTipo(e.target.value as any)}
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]">
              <option value="simple">Simple</option>
              <option value="anual">Con años</option>
              <option value="trimestral">Trimestral</option>
            </select>
            <button onClick={handleAdd} disabled={adding || !nombre.trim()}
              className="px-5 py-2 bg-[#2E1A47] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3d2560] disabled:opacity-40 transition-colors">
              {adding ? "..." : "Añadir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
