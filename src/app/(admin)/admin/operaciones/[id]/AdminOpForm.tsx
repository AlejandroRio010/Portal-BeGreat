"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fmtPctInput, fmtEuroInput, rawFromFmt } from "@/lib/format";
import AvalistasEditor, { type AvalistaForm, emptyAvalista, avalistasPayload } from "@/components/AvalistasEditor";
import PurchasePicker from "./PurchasePicker";
import ObliviateResolver, { type ObliviateVal } from "./ObliviateResolver";
import { rangoCuota } from "@/lib/cuotaRenting";

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
  initialFechaContrato: string | null;
  initialFechaFinContrato: string | null;
  initialCreatedAt: string | null;
  initialFechaCierre: string | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
  initialNecesidad?: string | null;
  initialTieneAval?: boolean;
  initialAvalTipo?: string | null;
  initialAvalNombre?: string | null;
  initialAvalEmail?: string | null;
  initialAvalTelefono?: string | null;
  initialAvalPersonaContacto?: string | null;
  initialAvalDni?: string | null;
  initialAvalEmpresa?: string | null;
  initialAvalContactId?: string | null;
  initialAvalClientId?: string | null;
  initialAvalistas?: AvalistaForm[];
  initialModalidadRenting?: string | null;
  initialCuotaAproxMin?: string | null;
  initialCuotaAproxMax?: string | null;
  initialCuotaDefinitiva?: string | null;
  initialImporteFacturadoBegreat?: string | null;
  initialImporteFacturadoVisible?: boolean;
  initialEntidadDestino?: string | null;
  initialEntidadVisible?: boolean;
  initialComisionOrigenes?: { tipo: string; porcentaje: string; importe: string }[];
  initialComisionColabPct?: string | null;
  initialComisionBegreatPct?: string | null;
  initialFacturaDestinatario?: string | null;
  initialColaboradores?: { id?: string; nombre: string; porcentaje: string; importe: string }[];
  initialMargenPct?: string | null;
  initialHoldedInvoiceId?: string | null;
  initialHoldedInvoiceNumber?: string | null;
  initialHoldedInvoices?: { id: string; number: string | null }[];
  initialHoldedPurchases?: { id: string; number: string | null; tipo: "pago" | "comision"; colaborador_id?: string | null }[];
  initialObliviateMov?: { tipo: string; colaborador_id?: string | null; importe: string; fecha: string; pagado?: boolean }[];
  // context names
  clientNombre?: string | null;
  supplierNombre?: string | null;
  colaboradorNombre?: string | null;
  colaboradorId?: string | null;
  // entity/office lists
  allEntities: EntityRow[];
  allOffices: OfficeRow[];
  allColaboradores?: { id: string; nombre: string; role: string; es_autonomo?: boolean }[];
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
  initialFechaContrato,
  initialFechaFinContrato,
  initialCreatedAt,
  initialFechaCierre,
  initialLugarEntrega,
  initialEquipoTipo,
  initialNecesidad,
  initialTieneAval,
  initialAvalTipo,
  initialAvalNombre,
  initialAvalEmail,
  initialAvalTelefono,
  initialAvalPersonaContacto,
  initialAvalDni,
  initialAvalEmpresa,
  initialAvalContactId,
  initialAvalClientId,
  initialAvalistas = [],
  initialModalidadRenting,
  initialCuotaAproxMin,
  initialCuotaAproxMax,
  initialCuotaDefinitiva,
  initialImporteFacturadoBegreat,
  initialImporteFacturadoVisible,
  initialEntidadDestino,
  initialEntidadVisible = true,
  initialComisionOrigenes = [],
  initialComisionColabPct,
  initialComisionBegreatPct,
  initialFacturaDestinatario,
  initialColaboradores = [],
  initialMargenPct,
  initialHoldedInvoiceId,
  initialHoldedInvoiceNumber,
  initialHoldedInvoices = [],
  initialHoldedPurchases = [],
  initialObliviateMov = [],
  clientNombre,
  supplierNombre,
  colaboradorNombre,
  colaboradorId,
  allEntities,
  allOffices,
  allColaboradores = [],
  customFieldDefs = [],
  customFieldValues: initialCustomFieldValues = [],
}: Props) {
  const router = useRouter();
  const fases = pipelineKey === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;

  // ── Admin-managed fields ──────────────────────────────────────────────────
  const [fase, setFase] = useState(initialFase);
  const [status, setStatus] = useState(initialStatus);
  const [comisionColab, setComisionColab] = useState(initialComisionColab ?? "");
  const [comisionColabPct, setComisionColabPct] = useState(initialComisionColabPct ?? "");
  const [comisionBegreat, setComisionBegreat] = useState(initialComisionBegreat ?? "");
  const [comisionBegreatPct, setComisionBegreatPct] = useState(initialComisionBegreatPct ?? "");
  const [comisionOrigenes, setComisionOrigenes] = useState<{ tipo: string; porcentaje: string; importe: string }[]>(
    initialComisionOrigenes.length > 0 ? initialComisionOrigenes : []
  );
  const [facturaDestinatario, setFacturaDestinatario] = useState(initialFacturaDestinatario ?? "proveedor");
  const [colaboradores, setColaboradores] = useState<{ id?: string; nombre: string; porcentaje: string; importe: string }[]>(
    initialColaboradores.length > 0 ? initialColaboradores : [{ id: colaboradorId ?? "", nombre: colaboradorNombre ?? "", porcentaje: "", importe: "" }]
  );
  const [margenPct, setMargenPct] = useState(initialMargenPct ?? "");
  // ── Facturas de Holded vinculadas (una op puede tener varias) ──────────────
  const [holdedInvoices, setHoldedInvoices] = useState<{ id: string; number: string | null }[]>(
    initialHoldedInvoices.length > 0
      ? initialHoldedInvoices
      : initialHoldedInvoiceId ? [{ id: initialHoldedInvoiceId, number: initialHoldedInvoiceNumber ?? null }] : []
  );
  const [facturaQuery, setFacturaQuery] = useState("");
  const [facturaResults, setFacturaResults] = useState<any[]>([]);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [facturaLoading, setFacturaLoading] = useState(false);
  const [facturaTodas, setFacturaTodas] = useState(false);
  const facturaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Facturas de COMPRA vinculadas: pago a proveedor/cliente + comisiones ────
  type PurchaseEntry = { id: string; number: string | null; tipo: "pago" | "comision"; colaborador_id?: string | null };
  const [holdedPurchases, setHoldedPurchases] = useState<PurchaseEntry[]>(
    (initialHoldedPurchases as PurchaseEntry[]) ?? []
  );
  const pagoLinks = holdedPurchases.filter(p => p.tipo === "pago").map(p => ({ id: p.id, number: p.number }));
  function setPagoLinks(next: { id: string; number: string | null }[]) {
    setHoldedPurchases(prev => [
      ...prev.filter(p => p.tipo !== "pago"),
      ...next.map(n => ({ id: n.id, number: n.number, tipo: "pago" as const })),
    ]);
  }
  function comisionLinks(colabId: string) {
    return holdedPurchases.filter(p => p.tipo === "comision" && p.colaborador_id === colabId).map(p => ({ id: p.id, number: p.number }));
  }
  function setComisionLinks(colabId: string, next: { id: string; number: string | null }[]) {
    setHoldedPurchases(prev => [
      ...prev.filter(p => !(p.tipo === "comision" && p.colaborador_id === colabId)),
      ...next.map(n => ({ id: n.id, number: n.number, tipo: "comision" as const, colaborador_id: colabId })),
    ]);
  }

  // ── Movimientos liquidados por Obliviate (fuera de Holded) ────────────────
  type OblEntry = { tipo: "cobro" | "mercaderia" | "comision"; colaborador_id?: string | null; importe: string; fecha: string; pagado: boolean };
  const [obliviateMov, setObliviateMov] = useState<OblEntry[]>((initialObliviateMov as OblEntry[]) ?? []);
  function getObl(tipo: OblEntry["tipo"], colabId?: string | null): ObliviateVal | null {
    const m = obliviateMov.find(x => x.tipo === tipo && (x.colaborador_id ?? null) === (colabId ?? null));
    return m ? { importe: m.importe, fecha: m.fecha } : null;
  }
  function setObl(tipo: OblEntry["tipo"], colabId: string | null, v: ObliviateVal | null) {
    setObliviateMov(prev => {
      const rest = prev.filter(x => !(x.tipo === tipo && (x.colaborador_id ?? null) === (colabId ?? null)));
      return v ? [...rest, { tipo, colaborador_id: colabId, importe: v.importe, fecha: v.fecha, pagado: true }] : rest;
    });
  }

  async function buscarFacturas(q: string, todas: boolean) {
    setFacturaLoading(true);
    try {
      // Contraparte que paga: en renting la entidad financiera; en consultoría el cliente
      const entidadNombre = allEntities.find(e => e.id === selectedEntityId)?.nombre ?? initialEntidad ?? "";
      const contraparte = pipelineKey === "renting" ? entidadNombre : (clientNombre ?? "");
      // Importe esperado: si BeGreat factura, el total facturado; si no, el fee
      const esperado = isFactura ? importeFacturadoBegreat : String(calcFeeTotal());
      const params = new URLSearchParams({ pipeline: pipelineKey, q, opId });
      if (todas) params.set("todas", "1");
      if (contraparte) params.set("contraparte", contraparte);
      if (esperado && Number(esperado) > 0) params.set("esperado", esperado);
      const res = await fetch(`/api/admin/holded/invoices?${params}`);
      setFacturaResults(res.ok ? await res.json() : []);
    } catch { setFacturaResults([]); }
    finally { setFacturaLoading(false); }
  }
  function onFacturaFocus() {
    setFacturaOpen(true);
    if (facturaResults.length === 0) buscarFacturas("", facturaTodas);
  }
  function onFacturaQuery(q: string) {
    setFacturaQuery(q);
    if (facturaTimer.current) clearTimeout(facturaTimer.current);
    facturaTimer.current = setTimeout(() => buscarFacturas(q, facturaTodas), 300);
  }
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
  // Derive initial selected entity from office or, if there is no office,
  // from the saved entidad_financiera name (otherwise the selector shows
  // empty on reload even though the entity is stored in the DB)
  const initialEntityId = initialEntityOfficeId
    ? (allOffices.find((o) => o.id === initialEntityOfficeId)?.entity_id ?? "")
    : (allEntities.find((e) => e.nombre === initialEntidad)?.id ?? "");
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
  const [fechaContrato, setFechaContrato] = useState(initialFechaContrato ?? "");
  const [fechaFinContrato, setFechaFinContrato] = useState(initialFechaFinContrato ?? "");
  const [fechaAlta, setFechaAlta] = useState(initialCreatedAt ?? "");
  const [fechaCierre, setFechaCierre] = useState(initialFechaCierre ?? "");
  const [lugarEntrega, setLugarEntrega] = useState(initialLugarEntrega ?? "");
  const [equipoTipo, setEquipoTipo] = useState(initialEquipoTipo ?? "");
  const [necesidad, setNecesidad] = useState(initialNecesidad ?? "");
  const [modalidadRenting, setModalidadRenting] = useState(initialModalidadRenting ?? "");
  const [cuotaAproxMin, setCuotaAproxMin] = useState(initialCuotaAproxMin ?? "");
  const [cuotaAproxMax, setCuotaAproxMax] = useState(initialCuotaAproxMax ?? "");
  const [cuotaDefinitiva, setCuotaDefinitiva] = useState(initialCuotaDefinitiva ?? "");
  const [importeFacturadoBegreat, setImporteFacturadoBegreat] = useState(initialImporteFacturadoBegreat ?? "");
  const [importeFacturadoVisible, setImporteFacturadoVisible] = useState(initialImporteFacturadoVisible ?? false);
  const [entidadDestino, setEntidadDestino] = useState(initialEntidadDestino ?? "");
  const [entidadVisible, setEntidadVisible] = useState(initialEntidadVisible);
  const [tieneAval, setTieneAval] = useState(!!initialTieneAval);
  const [avalistas, setAvalistas] = useState<AvalistaForm[]>(initialAvalistas);

  // Focus: show raw number; Blur: show formatted
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // ── Commission auto-calc helpers ───────────────────────────────────────────
  const importeNum = parseFloat(importe) || 0;
  const importeFactNum = parseFloat(importeFacturadoBegreat) || 0;
  const isFactura = modalidadRenting === "begreat_factura";

  // Cuota aproximada automática (mismo motor que el cotizador): importe + plazo.
  // Base financiada de la cuota: en «BeGreat factura» es lo que factura BeGreat
  // (lo que financia la entidad); en comisiona, el importe del equipo.
  const cuotaBase = isFactura && importeFactNum > 0 ? importeFactNum : importeNum;
  const cuotaAuto = pipelineKey === "renting" ? rangoCuota(cuotaBase, parseInt(plazoMeses) || 0) : null;
  // Autorrelleno de la cuota con el cotizador, sin pisar una edición manual.
  const cuotaTouched = useRef<boolean>(!!(initialCuotaAproxMin || initialCuotaAproxMax));
  useEffect(() => {
    if (!cuotaTouched.current && cuotaAuto) {
      setCuotaAproxMin(cuotaAuto.min.toFixed(2));
      setCuotaAproxMax(cuotaAuto.max.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importe, plazoMeses]);

  function origenLabel(tipo: string): string {
    if (tipo === "cliente") return clientNombre || "Cliente";
    if (tipo === "proveedor") return supplierNombre || "Proveedor";
    if (tipo === "entidad") {
      const ent = allEntities.find(e => e.id === selectedEntityId);
      return ent?.nombre || initialEntidad || "Entidad financiera";
    }
    return tipo;
  }

  function calcFeeTotal(): number {
    if (isFactura) return importeFactNum - importeNum;
    return comisionOrigenes.reduce((s, o) => s + (parseFloat(o.importe) || 0), 0);
  }

  function totalColabFee(): number {
    return colaboradores.reduce((s, c) => s + (parseFloat(c.importe) || 0), 0);
  }

  function addOrigen() {
    setComisionOrigenes([...comisionOrigenes, { tipo: "cliente", porcentaje: "", importe: "" }]);
  }

  function removeOrigen(i: number) {
    setComisionOrigenes(comisionOrigenes.filter((_, idx) => idx !== i));
  }

  function updateOrigen(i: number, field: "tipo" | "porcentaje" | "importe", val: string) {
    const next = [...comisionOrigenes];
    next[i] = { ...next[i], [field]: val };
    if (field === "porcentaje" && importeNum > 0) {
      next[i].importe = (importeNum * parseFloat(val || "0") / 100).toFixed(2);
    }
    if (field === "importe" && importeNum > 0) {
      next[i].porcentaje = (parseFloat(val || "0") / importeNum * 100).toFixed(2);
    }
    setComisionOrigenes(next);
  }

  function selectColab(i: number, colabId: string) {
    const oldId = colaboradores[i]?.id;
    const next = [...colaboradores];
    const found = allColaboradores.find(c => c.id === colabId);
    next[i] = { ...next[i], id: colabId, nombre: found?.nombre ?? "" };
    setColaboradores(next);
    // Al cambiar de persona, la factura de comisión vinculada al anterior deja de aplicar
    if (oldId && oldId !== colabId) {
      setHoldedPurchases(prev => prev.filter(p => !(p.tipo === "comision" && p.colaborador_id === oldId)));
    }
  }

  function updateColab(i: number, field: "porcentaje" | "importe", val: string) {
    const next = [...colaboradores];
    next[i] = { ...next[i], [field]: val };
    if (field === "porcentaje" && importeNum > 0) {
      next[i].importe = (importeNum * parseFloat(val || "0") / 100).toFixed(2);
    }
    if (field === "importe" && importeNum > 0) {
      next[i].porcentaje = (parseFloat(val || "0") / importeNum * 100).toFixed(2);
    }
    setColaboradores(next);
  }

  function addColab() {
    setColaboradores([...colaboradores, { id: "", nombre: "", porcentaje: "", importe: "" }]);
  }

  function removeColab(i: number) {
    const removedId = colaboradores[i]?.id;
    setColaboradores(colaboradores.filter((_, idx) => idx !== i));
    // Al quitar el colaborador, su factura de comisión vinculada ya no aplica
    if (removedId) {
      setHoldedPurchases(prev => prev.filter(p => !(p.tipo === "comision" && p.colaborador_id === removedId)));
    }
  }

  function recalcBegreat() {
    const feeTotal = calcFeeTotal();
    const colabTotal = totalColabFee();
    const bgFee = feeTotal - colabTotal;
    setComisionBegreat(bgFee > 0 ? bgFee.toFixed(2) : "0");
    if (importeNum > 0) setComisionBegreatPct(((bgFee / importeNum) * 100).toFixed(2));
    setComisionColab(colabTotal.toFixed(2));
    if (importeNum > 0) setComisionColabPct((colabTotal / importeNum * 100).toFixed(2));
  }

  function updateMargenPct(pct: string) {
    setMargenPct(pct);
    if (importeNum > 0) {
      const p = parseFloat(pct) || 0;
      setImporteFacturadoBegreat((importeNum * (1 + p / 100)).toFixed(2));
    }
  }

  function updateImporteFactura(val: string) {
    setImporteFacturadoBegreat(val);
    if (importeNum > 0) {
      const v = parseFloat(val) || 0;
      setMargenPct(((v - importeNum) / importeNum * 100).toFixed(2));
    }
  }

  // Cambiar el importe proveedor/cliente recalcula el facturado por BeGreat si
  // hay margen (modo factura), para que los dos importes se mantengan sincronizados.
  function updateImporteProveedor(val: string) {
    setImporte(val);
    const imp = parseFloat(val) || 0;
    if (isFactura && imp > 0 && margenPct) {
      const p = parseFloat(margenPct) || 0;
      setImporteFacturadoBegreat((imp * (1 + p / 100)).toFixed(2));
    }
  }

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
  const [editOpen, setEditOpen] = useState(false);
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
        plazo_meses: plazoMeses || null, fecha_contrato: fechaContrato || null, fecha_fin_contrato: fechaFinContrato || null,
        created_at: fechaAlta || null, fecha_cierre: fechaCierre || null,
        lugar_entrega: lugarEntrega || null, equipo_tipo: equipoTipo || null,
        necesidad: necesidad || null, modalidad_renting: modalidadRenting || null,
        cuota_aproximada_min: cuotaAproxMin || null, cuota_aproximada_max: cuotaAproxMax || null,
        cuota_definitiva: cuotaDefinitiva || null,
        avalistas: tieneAval ? avalistasPayload(avalistas) : [] });
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
        modalidad_renting: modalidadRenting || null,
        comision_colaborador: comisionColab || null,
        comision_colaborador_pct: comisionColabPct || null,
        comision_begreat: comisionBegreat || null,
        comision_begreat_pct: comisionBegreatPct || null,
        comision_origenes: comisionOrigenes.length > 0 ? comisionOrigenes : [],
        colaboradores: colaboradores.filter(c => c.nombre || c.porcentaje || c.importe),
        margen_pct: margenPct || null,
        factura_destinatario: isFactura ? facturaDestinatario : null,
        entity_office_id: selectedOfficeId || null,
        entidad_financiera: selectedEntity?.nombre ?? (initialEntidad || null),
        honorarios_firmado: honorarios,
        facturacion_renting: facturacionRenting || null,
        onedrive_url: onedriveUrl || null,
        es_renovacion: esRenovacion,
        operacion_original_id: esRenovacion ? (opOriginal?.id ?? null) : null,
        entidad_destino: entidadDestino || null,
        entidad_visible: entidadVisible,
        importe_facturado_begreat: importeFacturadoBegreat || null,
        importe_facturado_visible: importeFacturadoVisible,
        holded_invoices: holdedInvoices,
        holded_purchases: holdedPurchases,
        obliviate_mov: obliviateMov,
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
        <button
          onClick={() => setEditOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Editar datos de la operación</p>
          <span className="text-gray-400 text-sm">{editOpen ? "▲" : "▼"}</span>
        </button>

        {editOpen && (
        <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre / referencia</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la operación"
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              {pipelineKey === "renting" ? "Importe proveedor/cliente (€)" : "Importe (€)"}
            </label>
            <input type="number" step="0.01" value={importe} onChange={(e) => updateImporteProveedor(e.target.value)} placeholder="0.00"
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
            {pipelineKey === "renting" && <p className="text-[10px] text-gray-400 mt-1">Lo que se paga al proveedor/cliente por el equipo</p>}
          </div>
          {isFactura && (
            <>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Importe facturado por BeGreat (€)</label>
                <input type="number" step="0.01" value={importeFacturadoBegreat} onChange={(e) => updateImporteFactura(e.target.value)} placeholder="0.00"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                <p className="text-[10px] text-gray-400 mt-1">Lo que factura BeGreat — base de la financiación y la cuota</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Margen (%)</label>
                <input type="number" step="0.01" value={margenPct} onChange={(e) => updateMargenPct(e.target.value)} placeholder="0.00"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                <p className="text-[10px] text-gray-400 mt-1">Rellena el importe BeGreat, o pon el margen y sale solo (y al revés)</p>
              </div>
              <label className="col-span-2 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={importeFacturadoVisible} onChange={e => setImporteFacturadoVisible(e.target.checked)} className="w-4 h-4 accent-[#2E1A47]" />
                <span className="text-xs text-gray-600">Importe facturado visible para el colaborador</span>
              </label>
            </>
          )}
          {pipelineKey === "consultoria" && (
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Producto</label>
              <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Línea ICO, leasing..."
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
            </div>
          )}
          {pipelineKey === "renting" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Plazo (meses)</label>
                <input type="number" value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} placeholder="24"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Cuota aproximada (rango €/mes)</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={cuotaAproxMin} onChange={(e) => { cuotaTouched.current = true; setCuotaAproxMin(e.target.value); }} placeholder="Mín"
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="text" value={cuotaAproxMax} onChange={(e) => { cuotaTouched.current = true; setCuotaAproxMax(e.target.value); }} placeholder="Máx"
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                </div>
                {cuotaAuto && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Cotizador (sobre {isFactura ? "importe BeGreat" : "importe"} {cuotaBase.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € + {plazoMeses || "—"} meses): <b className="text-[#2E1A47]">{cuotaAuto.min.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – {cuotaAuto.max.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</b>{" "}
                    <button type="button" onClick={() => { setCuotaAproxMin(cuotaAuto.min.toFixed(2)); setCuotaAproxMax(cuotaAuto.max.toFixed(2)); }} className="text-[#2E1A47] font-semibold hover:underline">Aplicar</button>
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Cuota definitiva (€/mes)</label>
                <input type="text" value={cuotaDefinitiva} onChange={(e) => setCuotaDefinitiva(e.target.value)} placeholder="Cuota definitiva cuando se confirme"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha inicio contrato</label>
                <input type="date" value={fechaContrato} onChange={(e) => {
                  setFechaContrato(e.target.value);
                  if (e.target.value && plazoMeses) {
                    const d = new Date(e.target.value);
                    d.setMonth(d.getMonth() + parseInt(plazoMeses));
                    setFechaFinContrato(d.toISOString().split("T")[0]);
                  }
                }}
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha fin contrato</label>
                <input type="date" value={fechaFinContrato} onChange={(e) => setFechaFinContrato(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                {fechaContrato && plazoMeses && (
                  <p className="text-[10px] text-gray-400 mt-1">Auto-calculada: inicio + {plazoMeses} meses</p>
                )}
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
              <div className="grid grid-cols-2 gap-0 border border-gray-200">
                {([
                  ["begreat_comisiona", "BeGreat comisiona"],
                  ["begreat_factura", "BeGreat factura"],
                ] as const).map(([val, lbl], i) => (
                  <button key={val} type="button" onClick={() => setModalidadRenting(val)}
                    className={`py-2.5 text-[11px] font-semibold transition-all ${i > 0 ? "border-l border-gray-200" : ""} ${
                      modalidadRenting === val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}>{lbl}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de alta</label>
            <input type="date" value={fechaAlta} onChange={(e) => setFechaAlta(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de cierre</label>
            <input type="date" value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
          </div>
        </div>

        {/* Aval */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="block text-xs text-gray-400 uppercase tracking-wider">¿Aporta aval?</label>
          <div className="grid grid-cols-2 gap-0 border border-gray-200">
            <button type="button" onClick={() => setTieneAval(false)}
              className={`py-2 text-xs font-semibold transition-all ${!tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>No</button>
            <button type="button" onClick={() => { setTieneAval(true); if (avalistas.length === 0) setAvalistas([emptyAvalista()]); }}
              className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Sí</button>
          </div>
          {tieneAval && (
            <AvalistasEditor
              avalistas={avalistas}
              onChange={setAvalistas}
              inputCls="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]"
              labelCls="block text-xs text-gray-400 uppercase tracking-wider mb-1.5"
            />
          )}
        </div>

        <button onClick={handleSaveBasic} disabled={savingBasic}
          className="w-full py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
          {savingBasic ? "Guardando..." : "Guardar datos"}
        </button>
        {savedBasic && <p className="text-xs text-emerald-600 font-semibold text-center">Datos guardados.</p>}
        </div>
        )}
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

              {/* ── Panel de comisiones ── */}
              {(pipelineKey === "consultoria" || pipelineKey === "renting") && (
                <div className="col-span-1 space-y-4 border border-gray-200 p-4 bg-gray-50/50">
                  <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Comisiones</p>

                  {/* ── MODO COMISIONA ── */}
                  {(pipelineKey === "consultoria" || modalidadRenting === "begreat_comisiona") && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Orígenes de comisión</label>
                        {comisionOrigenes.map((o, i) => (
                          <div key={i} className="mb-3 p-2 bg-white border border-gray-100 relative">
                            <button type="button" onClick={() => removeOrigen(i)}
                              className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xs">✕</button>
                            <div className="mb-1.5">
                              <select value={o.tipo} onChange={e => updateOrigen(i, "tipo", e.target.value)}
                                className="w-full border border-gray-200 px-2 py-1.5 text-xs font-medium bg-white focus:outline-none focus:border-[#2E1A47]">
                                <option value="cliente">{clientNombre || "Cliente"}</option>
                                <option value="proveedor">{supplierNombre || "Proveedor"}</option>
                                <option value="entidad">{(() => { const ent = allEntities.find(e => e.id === selectedEntityId); return ent?.nombre || initialEntidad || "Entidad financiera"; })()}</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase">Comisión</span>
                                <input type="text" inputMode="decimal"
                                  value={focusedField === `origen-pct-${i}` ? o.porcentaje : (o.porcentaje ? fmtPctInput(o.porcentaje) : "")}
                                  onFocus={() => setFocusedField(`origen-pct-${i}`)}
                                  onBlur={() => setFocusedField(null)}
                                  onChange={e => { const v = rawFromFmt(e.target.value); updateOrigen(i, "porcentaje", v); }}
                                  placeholder="0,00%" className="w-full border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-[#2E1A47]" />
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase">Importe</span>
                                <input type="text" inputMode="decimal"
                                  value={focusedField === `origen-eur-${i}` ? o.importe : (o.importe ? fmtEuroInput(o.importe) : "")}
                                  onFocus={() => setFocusedField(`origen-eur-${i}`)}
                                  onBlur={() => setFocusedField(null)}
                                  onChange={e => { const v = rawFromFmt(e.target.value); updateOrigen(i, "importe", v); }}
                                  placeholder="0,00 €" className="w-full border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-[#2E1A47]" />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={addOrigen}
                          className="text-[10px] font-semibold text-[#2E1A47] hover:underline">+ Añadir origen de comisión</button>
                      </div>
                      {comisionOrigenes.length > 0 && (
                        <div className="bg-[#EEEBF3] px-3 py-2">
                          <p className="text-[10px] text-gray-500 uppercase">Fee total: <span className="font-bold text-[#2E1A47]">{calcFeeTotal().toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</span></p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── MODO FACTURA ── */}
                  {isFactura && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-400">Los importes y el margen se editan arriba, en «Editar datos de la operación».</p>
                      {importeFactNum > 0 && importeNum > 0 && (
                        <div className="bg-[#EEEBF3] px-3 py-2.5 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 mb-1.5">
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Factura BeGreat</p>
                              <p className="text-sm font-bold text-[#2E1A47]">{importeFactNum.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Se paga a {facturaDestinatario === "cliente" ? "cliente" : "proveedor"}</p>
                              <p className="text-sm font-bold text-gray-700">{importeNum.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase border-t border-[#2E1A47]/10 pt-1.5">Fee total (margen): <span className="font-bold text-[#2E1A47]">{(importeFactNum - importeNum).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</span></p>
                        </div>
                      )}

                      {/* Pago de mercadería: factura de compra al proveedor/cliente */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E1A47]" />
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Pago mercadería · factura de compra</label>
                        </div>
                        <PurchasePicker
                          opId={opId}
                          contraparte={facturaDestinatario === "cliente" ? (clientNombre ?? "") : (supplierNombre ?? "")}
                          esperado={importeNum}
                          selected={pagoLinks}
                          onChange={setPagoLinks}
                          accent="purple"
                          placeholder="Buscar factura de compra…"
                          hint="Lo que pagamos al proveedor/cliente por el equipo · sin las ya vinculadas a otra op"
                        />
                        <ObliviateResolver value={getObl("mercaderia", null)} onChange={v => setObl("mercaderia", null, v)} esperado={importeNum} verbo="pagado" />
                      </div>
                    </div>
                  )}

                  {/* ── Colaboradores (ambos modos) ── */}
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-2">Colaboradores de la operación</label>
                    {colaboradores.map((c, i) => (
                      <div key={i} className="mb-3 p-2 bg-white border border-gray-100 relative">
                        {colaboradores.length > 1 && (
                          <button type="button" onClick={() => removeColab(i)}
                            className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xs">✕</button>
                        )}
                        <div className="mb-1.5">
                          <select value={c.id ?? ""} onChange={e => selectColab(i, e.target.value)}
                            className="w-full border border-gray-200 px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2E1A47] bg-white">
                            <option value="">Seleccionar persona...</option>
                            {allColaboradores.map(ac => (
                              <option key={ac.id} value={ac.id}>
                                {ac.nombre}{ac.role === "admin" ? " (Admin)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase">Comisión</span>
                            <input type="text" inputMode="decimal"
                              value={focusedField === `colab-pct-${i}` ? c.porcentaje : (c.porcentaje ? fmtPctInput(c.porcentaje) : "")}
                              onFocus={() => setFocusedField(`colab-pct-${i}`)}
                              onBlur={() => setFocusedField(null)}
                              onChange={e => { const v = rawFromFmt(e.target.value); updateColab(i, "porcentaje", v); }}
                              placeholder="0,00%" className="w-full border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-[#2E1A47]" />
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase">Importe</span>
                            <input type="text" inputMode="decimal"
                              value={focusedField === `colab-eur-${i}` ? c.importe : (c.importe ? fmtEuroInput(c.importe) : "")}
                              onFocus={() => setFocusedField(`colab-eur-${i}`)}
                              onBlur={() => setFocusedField(null)}
                              onChange={e => { const v = rawFromFmt(e.target.value); updateColab(i, "importe", v); }}
                              placeholder="0,00 €" className="w-full border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-[#2E1A47]" />
                          </div>
                        </div>
                        {(() => {
                          const colabAut = allColaboradores.find(ac => ac.id === c.id)?.es_autonomo;
                          const base = parseFloat(c.importe) || 0;
                          if (!colabAut || base <= 0) return null;
                          const iva = base * 0.21, irpf = base * 0.07, total = base + iva - irpf;
                          const f = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          return (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-800 leading-relaxed">
                              <span className="font-bold uppercase tracking-wide">Autónomo</span> · {f(base)} + IVA 21% {f(iva)} − IRPF 7% <b>{f(irpf)}</b> = <b>{f(total)} €</b> a pagar
                            </div>
                          );
                        })()}
                        {/* Pago de la comisión: factura de compra del colaborador en Holded */}
                        <div className="mt-2 border-t border-dashed border-gray-100 pt-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">Pago · factura de compra en Holded</span>
                          </div>
                          {c.id ? (
                            <>
                              <PurchasePicker
                                opId={opId}
                                contraparte={c.nombre}
                                esperado={c.importe}
                                selected={comisionLinks(c.id)}
                                onChange={next => setComisionLinks(c.id!, next)}
                                accent="amber"
                                placeholder="Buscar factura de comisión…"
                                hint={`Compras de ${c.nombre || "este colaborador"} · IVA 21% / IRPF 7% por detrás`}
                              />
                              <ObliviateResolver value={getObl("comision", c.id)} onChange={v => setObl("comision", c.id!, v)} esperado={c.importe} verbo="pagado" />
                            </>
                          ) : (
                            <p className="text-[9px] text-gray-400">Selecciona la persona para vincular su factura de pago.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addColab}
                      className="w-full mt-1 text-xs font-semibold text-[#2E1A47] border border-dashed border-[#2E1A47]/40 rounded-lg px-3 py-2 hover:bg-[#EEEBF3] transition-colors">
                      + Añadir colaborador
                    </button>
                    <p className="text-[9px] text-gray-400 mt-1">% calculado sobre importe proveedor ({importeNum.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €)</p>
                  </div>

                  {/* ── Fee BeGreat (auto = fee total - colabs) ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Fee BeGreat</label>
                      <button type="button" onClick={recalcBegreat}
                        className="text-[9px] font-semibold text-[#2E1A47] hover:underline">↻ Recalcular</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-100 border border-gray-100 px-2 py-1.5 text-xs text-gray-600">
                        <span className="text-[9px] text-gray-400 uppercase block">%</span>
                        {comisionBegreatPct ? `${parseFloat(comisionBegreatPct).toLocaleString("es-ES", { minimumFractionDigits: 2 })}%` : "—"}
                      </div>
                      <div className="bg-gray-100 border border-gray-100 px-2 py-1.5 text-xs text-gray-600">
                        <span className="text-[9px] text-gray-400 uppercase block">€</span>
                        {comisionBegreat ? `${parseFloat(comisionBegreat).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €` : "—"}
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">Fee total ({calcFeeTotal().toLocaleString("es-ES", { minimumFractionDigits: 2 })} €) − Colaboradores ({totalColabFee().toLocaleString("es-ES", { minimumFractionDigits: 2 })} €)</p>
                  </div>

                  {/* ── Cobro: facturas de Holded vinculadas (una o varias) ── */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Cobro · facturas en Holded</label>
                    </div>

                    {/* Facturas ya vinculadas */}
                    {holdedInvoices.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 mb-1.5">
                        <p className="text-xs font-bold text-emerald-800 truncate">Factura {f.number ?? f.id}</p>
                        <button type="button" onClick={() => setHoldedInvoices(holdedInvoices.filter(x => x.id !== f.id))}
                          className="text-[10px] text-gray-400 hover:text-red-500 flex-shrink-0 ml-2">✕ Quitar</button>
                      </div>
                    ))}

                    {/* Buscador para añadir otra */}
                    <div className="relative">
                      <input value={facturaQuery}
                        onChange={e => onFacturaQuery(e.target.value)}
                        onFocus={onFacturaFocus}
                        onBlur={() => setTimeout(() => setFacturaOpen(false), 200)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#2E1A47]"
                        placeholder={holdedInvoices.length > 0 ? "+ Añadir otra factura (cobro en 2 partes)…" : "Buscar factura de cobro…"} autoComplete="off" />
                      {facturaLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-[#2E1A47] animate-spin rounded-full" />}
                      {facturaOpen && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                          <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 cursor-pointer sticky top-0">
                            <input type="checkbox" checked={facturaTodas}
                              onChange={e => { setFacturaTodas(e.target.checked); buscarFacturas(facturaQuery, e.target.checked); }}
                              className="w-3.5 h-3.5 accent-[#2E1A47]" />
                            <span className="text-[10px] text-gray-500">Ver todas (sin filtrar por {pipelineKey === "renting" ? "entidad/renting" : "cliente/consultoría"})</span>
                          </label>
                          {facturaResults.filter((f: any) => !holdedInvoices.some(h => h.id === f.id)).length === 0 ? (
                            <p className="px-3 py-3 text-xs text-gray-400">{facturaLoading ? "Buscando…" : "Sin facturas disponibles."}</p>
                          ) : facturaResults.filter((f: any) => !holdedInvoices.some(h => h.id === f.id)).map((f: any) => (
                            <button key={f.id} type="button"
                              onMouseDown={() => { setHoldedInvoices([...holdedInvoices, { id: f.id, number: f.numero }]); setFacturaOpen(false); setFacturaQuery(""); }}
                              className={`w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0 ${f.coincide_importe ? "bg-emerald-50/40" : ""}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-800 truncate">{f.cliente}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${f.estado === "cobrada" ? "bg-emerald-100 text-emerald-700" : f.estado === "parcial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{f.estado === "cobrada" ? "Cobrada" : f.estado === "parcial" ? "Parcial" : "Pendiente"}</span>
                              </div>
                              <p className="text-[10px] text-gray-400">
                                {f.numero} · {fmtEuroInput(String(f.total))}€ · {new Date(f.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                                {f.coincide_importe && <span className="text-emerald-600 font-semibold"> · ✓ cuadra con el fee</span>}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {pipelineKey === "renting" ? "Facturas de renting a la entidad de la op" : "Facturas de consultoría al cliente de la op"} · sin las ya vinculadas a otra op. El estado y el cuadre se ven en la ficha.
                      </p>
                      <ObliviateResolver value={getObl("cobro", null)} onChange={v => setObl("cobro", null, v)} esperado={isFactura ? importeFacturadoBegreat : calcFeeTotal()} verbo="cobrado" />
                    </div>
                  </div>
                </div>
              )}


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
                {selectedEntityId && allEntities.find(e => e.id === selectedEntityId)?.tipo !== "banco" && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200">
                    <input type="checkbox" id="entidadVisible" checked={entidadVisible} onChange={(e) => setEntidadVisible(e.target.checked)}
                      className="w-4 h-4 accent-[#2E1A47]" />
                    <label htmlFor="entidadVisible" className="text-xs text-gray-700 cursor-pointer">
                      Nombre de entidad visible para el colaborador
                    </label>
                  </div>
                )}
              </div>

              {/* Entidad destino (broker → banco final) */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entidad destino (banco final)</label>
                <input value={entidadDestino} onChange={(e) => setEntidadDestino(e.target.value)}
                  placeholder="Si la entidad es broker, ¿a qué banco lleva la op?"
                  className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47]" />
                <p className="text-[10px] text-gray-400 mt-1">Ej: Tendrit → Credit Agricole. Solo visible para admin y colaboradores con permiso.</p>
              </div>

              {/* Importe facturado section moved to commission panel */}

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
