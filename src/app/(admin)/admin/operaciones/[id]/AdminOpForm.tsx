"use client";

import { useState, useRef, useEffect } from "react";
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

interface EntityRow  { id: string; nombre: string; tipo: string }
interface OfficeRow  { id: string; entity_id: string; nombre: string; ciudad: string | null }

interface Props {
  opId: string;
  pipelineKey: string;
  initialFase: string;
  initialStatus: string;
  initialComisionColab: string | null;
  initialComisionBegreat: string | null;
  initialEntidad: string | null;
  initialEntityOfficeId: string | null;
  initialHonorarios: boolean | null;
  initialNotasAdmin: string | null;
  initialFacturacionRenting: string | null;
  initialOnedriveUrl: string | null;
  initialEsRenovacion?: boolean | null;
  initialOpOriginal?: { id: string; codigo: string | null; nombre: string | null } | null;
  // basic op fields
  initialNombre: string | null;
  initialDescripcion: string | null;
  initialImporte: string | null;
  initialProducto: string | null;
  initialPlazoMeses: number | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
  initialNecesidad?: string | null;
  initialTieneAval?: boolean;
  initialAvalTipo?: string | null;
  initialAvalNombre?: string | null;
  initialAvalEmail?: string | null;
  initialAvalTelefono?: string | null;
  initialAvalPersonaContacto?: string | null;
  initialModalidadRenting?: string | null;
  initialImporteFacturadoBegreat?: string | null;
  initialImporteFacturadoVisible?: boolean;
  initialEntidadDestino?: string | null;
  // entity/office lists
  allEntities: EntityRow[];
  allOffices: OfficeRow[];
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
  initialEntityOfficeId,
  initialHonorarios,
  initialNotasAdmin,
  initialFacturacionRenting,
  initialEsRenovacion,
  initialOpOriginal,
  initialOnedriveUrl,
  initialNombre,
  initialDescripcion,
  initialImporte,
  initialProducto,
  initialPlazoMeses,
  initialLugarEntrega,
  initialEquipoTipo,
  initialNecesidad,
  initialTieneAval,
  initialAvalTipo,
  initialAvalNombre,
  initialAvalEmail,
  initialAvalTelefono,
  initialAvalPersonaContacto,
  initialModalidadRenting,
  initialImporteFacturadoBegreat,
  initialImporteFacturadoVisible,
  initialEntidadDestino,
  allEntities,
  allOffices,
  customFieldDefs = [],
  customFieldValues: initialCustomFieldValues = [],
}: Props) {
  const router = useRouter();
  const fases = pipelineKey === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;

  // ── Admin-managed fields ──────────────────────────────────────────────────
  const [fase, setFase] = useState(initialFase);
  const [status, setStatus] = useState(initialStatus);
  const [comisionColab, setComisionColab] = useState(initialComisionColab ?? "");
  const [comisionBegreat, setComisionBegreat] = useState(initialComisionBegreat ?? "");
  const [honorarios, setHonorarios] = useState(initialHonorarios ?? false);
  const [facturacionRenting, setFacturacionRenting] = useState(initialFacturacionRenting ?? "");
  const [esRenovacion, setEsRenovacion] = useState(initialEsRenovacion ?? false);
  const [opOriginal, setOpOriginal] = useState(initialOpOriginal ?? null);
  const [renovBusq, setRenovBusq] = useState("");
  const [renovRes, setRenovRes] = useState<any[]>([]);
  const [renovOpen, setRenovOpen] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (renovTimer.current) clearTimeout(renovTimer.current);
    if (renovBusq.length < 2) { setRenovRes([]); return; }
    renovTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/operations/search?q=${encodeURIComponent(renovBusq)}`);
      setRenovRes(await r.json()); setRenovOpen(true);
    }, 250);
  }, [renovBusq]);
  const [onedriveUrl, setOnedriveUrl] = useState(initialOnedriveUrl ?? "");
  const [notasAdmin, setNotasAdmin] = useState(initialNotasAdmin ?? "");

  // ── Entity / office selector ──────────────────────────────────────────────
  // Derive initial selected entity from office or entidad text
  const initialEntityId = initialEntityOfficeId
    ? (allOffices.find((o) => o.id === initialEntityOfficeId)?.entity_id ?? "")
    : "";
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId);
  const [selectedOfficeId, setSelectedOfficeId] = useState(initialEntityOfficeId ?? "");
  const filteredOffices = allOffices.filter((o) => o.entity_id === selectedEntityId);

  function handleEntityChange(entityId: string) {
    setSelectedEntityId(entityId);
    setSelectedOfficeId(""); // reset office when entity changes
  }

  // ── Basic op fields ───────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(initialNombre ?? "");
  const [descripcion, setDescripcion] = useState(initialDescripcion ?? "");
  const [importe, setImporte] = useState(initialImporte ?? "");
  const [producto, setProducto] = useState(initialProducto ?? "");
  const [plazoMeses, setPlazoMeses] = useState(initialPlazoMeses ? String(initialPlazoMeses) : "");
  const [lugarEntrega, setLugarEntrega] = useState(initialLugarEntrega ?? "");
  const [equipoTipo, setEquipoTipo] = useState(initialEquipoTipo ?? "");
  const [necesidad, setNecesidad] = useState(initialNecesidad ?? "");
  const [modalidadRenting, setModalidadRenting] = useState(initialModalidadRenting ?? "");
  const [importeFacturadoBegreat, setImporteFacturadoBegreat] = useState(initialImporteFacturadoBegreat ?? "");
  const [importeFacturadoVisible, setImporteFacturadoVisible] = useState(initialImporteFacturadoVisible ?? false);
  const [entidadDestino, setEntidadDestino] = useState(initialEntidadDestino ?? "");
  const [tieneAval, setTieneAval] = useState(!!initialTieneAval);
  const [avalTipo, setAvalTipo] = useState(initialAvalTipo ?? "persona_fisica");
  const [avalNombre, setAvalNombre] = useState(initialAvalNombre ?? "");
  const [avalEmail, setAvalEmail] = useState(initialAvalEmail ?? "");
  const [avalTelefono, setAvalTelefono] = useState(initialAvalTelefono ?? "");
  const [avalPersonaContacto, setAvalPersonaContacto] = useState(initialAvalPersonaContacto ?? "");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savedBasic, setSavedBasic] = useState(false);
  const [savingNotas, setSavingNotas] = useState(false);
  const [savedNotas, setSavedNotas] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [savedCustom, setSavedCustom] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  // ── Custom fields ─────────────────────────────────────────────────────────
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const v of initialCustomFieldValues) m[v.field_id] = v.valor ?? "";
    return m;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al guardar");
    router.refresh();
  }

  async function handleSaveBasic() {
    setSavingBasic(true);
    setSavedBasic(false);
    setError(null);
    try {
      await patch({ nombre: nombre || null, descripcion: descripcion || null, importe: importe || null, producto: producto || null,
        plazo_meses: plazoMeses || null, lugar_entrega: lugarEntrega || null, equipo_tipo: equipoTipo || null,
        necesidad: necesidad || null, modalidad_renting: modalidadRenting || null,
        tiene_aval: tieneAval,
        aval_tipo: tieneAval ? avalTipo : null,
        aval_nombre: tieneAval ? (avalNombre || null) : null,
        aval_email: tieneAval ? (avalEmail || null) : null,
        aval_telefono: tieneAval ? (avalTelefono || null) : null,
        aval_persona_contacto: tieneAval ? (avalPersonaContacto || null) : null });
      setSavedBasic(true);
    } catch { setError("Error al guardar datos básicos."); }
    finally { setSavingBasic(false); }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const selectedEntity = allEntities.find((e) => e.id === selectedEntityId);
      await patch({
        fase,
        status,
        comision_colaborador: comisionColab || null,
        comision_begreat: comisionBegreat || null,
        entity_office_id: selectedOfficeId || null,
        // sync entidad_financiera text for collaborator display
        entidad_financiera: selectedEntity?.nombre ?? (initialEntidad || null),
        honorarios_firmado: honorarios,
        facturacion_renting: facturacionRenting || null,
        onedrive_url: onedriveUrl || null,
        es_renovacion: esRenovacion,
        operacion_original_id: esRenovacion ? (opOriginal?.id ?? null) : null,
        entidad_destino: entidadDestino || null,
        importe_facturado_begreat: importeFacturadoBegreat || null,
        importe_facturado_visible: importeFacturadoVisible,
      });
      setSaved(true);
    } catch { setError("Error al guardar los cambios."); }
    finally { setSaving(false); }
  }

  async function handleSaveNotas() {
    setSavingNotas(true);
    setSavedNotas(false);
    try {
      await patch({ notas_admin: notasAdmin || null });
      setSavedNotas(true);
    } catch { setError("Error al guardar las notas."); }
    finally { setSavingNotas(false); }
  }

  async function handleSaveCustomFields() {
    if (customFieldDefs.length === 0) return;
    setSavingCustom(true);
    setSavedCustom(false);
    try {
      await Promise.all(customFieldDefs.map((f) =>
        fetch("/api/admin/custom-field-values", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field_id: f.id, entity_id: opId, valor: customValues[f.id] ?? "" }),
        })
      ));
      setSavedCustom(true);
      router.refresh();
    } catch { setError("Error al guardar campos adicionales."); }
    finally { setSavingCustom(false); }
  }

  // ── Denegación con motivo ───────────────────────────────────────────────
  const [showDenegar, setShowDenegar] = useState(false);
  const [motivoDenegacion, setMotivoDenegacion] = useState("");

  async function handleStatus(newStatus: string, extra?: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await patch({ status: newStatus, ...extra });
      setStatus(newStatus);
    } catch { setError("Error al cambiar el estado."); }
    finally { setSaving(false); }
  }

  async function handleDenegar() {
    if (!motivoDenegacion.trim()) return;
    await handleStatus("archivada", { motivo_denegacion: motivoDenegacion.trim() });
    setShowDenegar(false);
  }

  return (
    <>
      {/* ── Datos básicos de la operación (editables por admin) ───────────── */}
      <div className="bg-white border border-gray-200 p-5 space-y-4 mb-0">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest pb-3 border-b border-gray-100">
          Editar datos de la operación
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre / referencia</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la operación"
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Importe (€)</label>
            <input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00"
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Producto</label>
            <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Línea ICO, leasing..."
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
          {pipelineKey === "renting" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Plazo (meses)</label>
                <input type="number" value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} placeholder="24"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tipo de equipo</label>
                <input value={equipoTipo} onChange={(e) => setEquipoTipo(e.target.value)} placeholder="Vehículos, maquinaria..."
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Lugar de entrega</label>
                <input value={lugarEntrega} onChange={(e) => setLugarEntrega(e.target.value)} placeholder="Ciudad, dirección..."
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
            </>
          )}
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Descripción de la operación..."
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47] resize-none" />
          </div>
          {pipelineKey === "consultoria" && (
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Necesidad del cliente</label>
              <textarea value={necesidad} onChange={(e) => setNecesidad(e.target.value)} rows={2} placeholder="Breve descripción de la necesidad..."
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47] resize-none" />
            </div>
          )}
          {pipelineKey === "renting" && (
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Modalidad</label>
              <div className="grid grid-cols-3 gap-0 border border-gray-200">
                {([
                  ["begreat_comisiona", "BeGreat comisiona"],
                  ["begreat_factura", "BeGreat factura"],
                  ["begreat_factura_comisiona", "Factura & comisiona"],
                ] as const).map(([val, lbl], i) => (
                  <button key={val} type="button" onClick={() => setModalidadRenting(val)}
                    className={`py-2 text-[11px] font-semibold transition-all ${i > 0 ? "border-l border-gray-200" : ""} ${
                      modalidadRenting === val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}>{lbl}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aval */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="block text-xs text-gray-400 uppercase tracking-wider">¿Aporta aval?</label>
          <div className="grid grid-cols-2 gap-0 border border-gray-200">
            <button type="button" onClick={() => setTieneAval(false)}
              className={`py-2 text-xs font-semibold transition-all ${!tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>No</button>
            <button type="button" onClick={() => setTieneAval(true)}
              className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Sí</button>
          </div>
          {tieneAval && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-0 border border-gray-200">
                <button type="button" onClick={() => setAvalTipo("persona_fisica")}
                  className={`py-2 text-xs font-semibold transition-all ${avalTipo === "persona_fisica" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Persona física</button>
                <button type="button" onClick={() => setAvalTipo("empresa")}
                  className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${avalTipo === "empresa" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Empresa</button>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre{avalTipo === "empresa" ? " de la empresa" : ""}</label>
                <input value={avalNombre} onChange={(e) => setAvalNombre(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
                  placeholder={avalTipo === "empresa" ? "Nombre de la empresa avalista" : "Nombre completo"} />
              </div>
              {avalTipo === "persona_fisica" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={avalEmail} onChange={(e) => setAvalEmail(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Teléfono</label>
                    <input value={avalTelefono} onChange={(e) => setAvalTelefono(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Persona de contacto</label>
                    <input value={avalPersonaContacto} onChange={(e) => setAvalPersonaContacto(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={avalEmail} onChange={(e) => setAvalEmail(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleSaveBasic} disabled={savingBasic}
          className="w-full py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
          {savingBasic ? "Guardando..." : "Guardar datos"}
        </button>
        {savedBasic && <p className="text-xs text-emerald-600 font-semibold text-center">Datos guardados.</p>}
      </div>

      {/* ── Gestión admin ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 p-5 space-y-5">
        <button
          onClick={() => setAdminOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Gestión admin</p>
          <span className="text-gray-400 text-sm">{adminOpen ? "▲" : "▼"}</span>
        </button>

        {adminOpen && (
          <>
            <div className="border-t border-gray-100 pt-4 space-y-5">
              {/* Status actions */}
              {status === "pendiente_de_validar" && (
                <div className="flex gap-3">
                  <button onClick={() => handleStatus("activa")} disabled={saving}
                    className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    Aprobar →
                  </button>
                  <button onClick={() => setShowDenegar(true)} disabled={saving}
                    className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    Denegar
                  </button>
                </div>
              )}
              {status === "activa" && (
                <div className="space-y-2">
                  <button onClick={() => setShowDenegar(true)} disabled={saving}
                    className="w-full py-2 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                    Marcar como denegada
                  </button>
                </div>
              )}
              {status === "archivada" && (
                <button onClick={() => handleStatus("activa")} disabled={saving}
                  className="w-full py-2 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                  Reactivar
                </button>
              )}

              {/* Modal motivo denegación */}
              {showDenegar && (
                <div className="bg-red-50 border border-red-200 p-4 space-y-3">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider">¿Por qué se deniega esta operación?</p>
                  <textarea
                    value={motivoDenegacion}
                    onChange={e => setMotivoDenegacion(e.target.value)}
                    rows={3}
                    placeholder="El motivo será visible para el colaborador..."
                    className="w-full border border-red-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleDenegar} disabled={saving || !motivoDenegacion.trim()}
                      className="flex-1 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      {saving ? "Denegando..." : "Confirmar denegación"}
                    </button>
                    <button onClick={() => { setShowDenegar(false); setMotivoDenegacion(""); }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Fase */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fase</label>
                <select value={fase} onChange={(e) => setFase(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]">
                  {fases.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Fee colaborador */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fee colaborador (€)</label>
                <input type="number" step="0.01" value={comisionColab} onChange={(e) => setComisionColab(e.target.value)} placeholder="0.00"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>

              {/* Fee BeGreat */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fee BeGreat (€)</label>
                <input type="number" step="0.01" value={comisionBegreat} onChange={(e) => setComisionBegreat(e.target.value)} placeholder="0.00"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>

              {/* Entidad financiera → Oficina */}
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider">Entidad financiera / Oficina</label>
                <select value={selectedEntityId} onChange={(e) => handleEntityChange(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]">
                  <option value="">— Seleccionar entidad —</option>
                  {allEntities.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                {selectedEntityId && (
                  <select value={selectedOfficeId} onChange={(e) => setSelectedOfficeId(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="">— Sin oficina específica —</option>
                    {filteredOffices.map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}{o.ciudad ? ` (${o.ciudad})` : ""}</option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-gray-400">Los colaboradores solo ven el nombre del banco, no la oficina.</p>
              </div>

              {/* Entidad destino (broker → banco final) */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entidad destino (banco final)</label>
                <input value={entidadDestino} onChange={(e) => setEntidadDestino(e.target.value)}
                  placeholder="Si la entidad es broker, ¿a qué banco lleva la op?"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                <p className="text-[10px] text-gray-400 mt-1">Ej: Tendrit → Credit Agricole. Solo visible para admin y colaboradores con permiso.</p>
              </div>

              {/* Importe facturado por BeGreat (solo renting + BG factura) */}
              {pipelineKey === "renting" && (modalidadRenting === "begreat_factura" || modalidadRenting === "begreat_factura_comisiona") && (
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Importe facturado por BeGreat (sin IVA)</label>
                  <input type="number" step="0.01" value={importeFacturadoBegreat} onChange={(e) => setImporteFacturadoBegreat(e.target.value)}
                    placeholder="Ej: 11500"
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" id="importeFacturadoVisible" checked={importeFacturadoVisible} onChange={(e) => setImporteFacturadoVisible(e.target.checked)}
                      className="w-4 h-4 accent-[#2E1A47]" />
                    <label htmlFor="importeFacturadoVisible" className="text-xs text-gray-600 cursor-pointer">Visible para el colaborador</label>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Si no marcas la casilla, solo tú (admin) lo verás.</p>
                </div>
              )}

              {/* Honorarios firmados */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="honorarios" checked={honorarios} onChange={(e) => setHonorarios(e.target.checked)}
                  className="w-4 h-4 accent-[#2E1A47]" />
                <label htmlFor="honorarios" className="text-sm text-gray-700 cursor-pointer">Honorarios firmados</label>
              </div>

              {/* Es renovación */}
              <div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="renovacion" checked={esRenovacion} onChange={(e) => setEsRenovacion(e.target.checked)}
                    className="w-4 h-4 accent-[#2E1A47]" />
                  <label htmlFor="renovacion" className="text-sm text-gray-700 cursor-pointer">Es una renovación de una operación anterior</label>
                </div>
                {esRenovacion && (
                  <div className="relative mt-2">
                    {opOriginal ? (
                      <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2">
                        <span className="text-xs font-semibold text-[#2E1A47]">{opOriginal.codigo} — {opOriginal.nombre}</span>
                        <button type="button" onClick={() => setOpOriginal(null)} className="text-[10px] text-gray-400 hover:text-red-500">✕ Cambiar</button>
                      </div>
                    ) : (
                      <>
                        <input value={renovBusq} onChange={(e) => setRenovBusq(e.target.value)}
                          onBlur={() => setTimeout(() => setRenovOpen(false), 150)}
                          className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
                          placeholder="Buscar la operación original a vincular..." autoComplete="off" />
                        {renovOpen && renovRes.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                            {renovRes.filter((o: any) => o.id !== opId).map((o: any) => (
                              <button key={o.id} type="button" onMouseDown={() => { setOpOriginal(o); setRenovBusq(""); setRenovOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                                <p className="text-xs font-semibold text-gray-800">{o.nombre ?? o.client_nombre}</p>
                                <p className="text-[10px] text-gray-400">{o.codigo} · {o.client_nombre}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Modalidad facturación renting */}
              {pipelineKey === "renting" && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="block text-xs text-gray-400 uppercase tracking-wider">Modalidad de facturación</label>
                    <span className="text-[10px] bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 font-semibold">Solo admin</span>
                  </div>
                  <select value={facturacionRenting} onChange={(e) => setFacturacionRenting(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="">Sin especificar</option>
                    <option value="begreat">BeGreat factura y paga al proveedor</option>
                    <option value="financiera">La financiera paga directamente al proveedor</option>
                  </select>
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar gestión admin"}
              </button>
              {saved && <p className="text-xs text-emerald-600 font-semibold text-center">Cambios guardados correctamente.</p>}
              {error && <p className="text-xs text-red-600 font-semibold text-center">{error}</p>}
            </div>
          </>
        )}
      </div>

      {/* ── Campos adicionales ───────────────────────────────────────────────── */}
      {customFieldDefs.length > 0 && (
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest pb-3 border-b border-gray-100">Campos adicionales</p>
          {customFieldDefs.map((f) => (
            <div key={f.id}>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{f.etiqueta}</label>
              <input
                type={f.tipo === "euros" || f.tipo === "porcentaje" ? "number" : f.tipo === "enlace" ? "url" : "text"}
                step={f.tipo === "euros" || f.tipo === "porcentaje" ? "0.01" : undefined}
                value={customValues[f.id] ?? ""}
                onChange={(e) => setCustomValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                placeholder={f.tipo === "euros" ? "0.00" : f.tipo === "porcentaje" ? "0" : f.tipo === "enlace" ? "https://..." : ""}
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
              />
            </div>
          ))}
          <button onClick={handleSaveCustomFields} disabled={savingCustom}
            className="w-full py-2 border border-[#2E1A47] text-[#2E1A47] text-sm font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50">
            {savingCustom ? "Guardando..." : "Guardar campos adicionales"}
          </button>
          {savedCustom && <p className="text-xs text-emerald-600 font-semibold text-center">Campos guardados.</p>}
        </div>
      )}

      {/* ── Notas internas ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Notas internas</p>
          <span className="text-[10px] bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 font-semibold">Solo admin</span>
        </div>
        <textarea value={notasAdmin} onChange={(e) => setNotasAdmin(e.target.value)} rows={4}
          placeholder="Notas internas solo visibles por administradores..."
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47] resize-none" />
        <button onClick={handleSaveNotas} disabled={savingNotas}
          className="w-full py-2 border border-[#2E1A47] text-[#2E1A47] text-sm font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50">
          {savingNotas ? "Guardando..." : "Guardar notas internas"}
        </button>
        {savedNotas && <p className="text-xs text-emerald-600 font-semibold text-center">Notas guardadas.</p>}
      </div>
    </>
  );
}
