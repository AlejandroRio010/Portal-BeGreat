"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";
import CuotaEstimada from "@/components/CuotaEstimada";
import { fmtEuroInput, rawFromFmt } from "@/lib/format";

const PRODUCTOS_CONSULTORIA = ["Póliza de crédito", "Leasing", "Préstamo", "Confirming", "Factoring", "Otro"];
const PLAZOS = [24, 36, 48, 60, 72];
const PROVINCIAS = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz",
  "Barcelona","Bizkaia","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta",
  "Ciudad Real","Córdoba","Cuenca","Gipuzkoa","Girona","Granada","Guadalajara",
  "Huelva","Huesca","Illes Balears","Jaén","La Rioja","Las Palmas","León","Lleida",
  "Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia",
  "Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria",
  "Tarragona","Teruel","Toledo","Valencia","Valladolid","Zamora","Zaragoza",
];

type Pipeline = "consultoria" | "renting";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

interface Colab { id: string; nombre: string; codigo: string | null }

export default function AltaOpAdminForm({ colaboradores }: { colaboradores: Colab[] }) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const [producto, setProducto] = useState("");
  const [esRenovacion, setEsRenovacion] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [esNuevoCliente, setEsNuevoCliente] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteWeb, setClienteWeb] = useState("");
  const [clienteCif, setClienteCif] = useState("");
  const [clienteCnae, setClienteCnae] = useState("");
  const [clienteProvincia, setClienteProvincia] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteNombreComercial, setClienteNombreComercial] = useState("");
  const [importe, setImporte] = useState("");
  const [plazoMeses, setPlazoMeses] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [clienteMissingData, setClienteMissingData] = useState<string[]>([]);
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  // Supplier state
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorEmail, setProveedorEmail] = useState("");
  const [proveedorTelefono, setProveedorTelefono] = useState("");
  const [proveedorWeb, setProveedorWeb] = useState("");
  const [proveedorCif, setProveedorCif] = useState("");
  const [proveedorCnae, setProveedorCnae] = useState("");
  const [proveedorDireccion, setProveedorDireccion] = useState("");
  const [proveedorProvincia, setProveedorProvincia] = useState("");
  const [proveedorNombreComercial, setProveedorNombreComercial] = useState("");
  const [esNuevoProveedor, setEsNuevoProveedor] = useState(false);
  const [proveedorMissingData, setProveedorMissingData] = useState<string[]>([]);
  const [proformaFile, setProformaFile] = useState<File | null>(null);
  const [proveedorContacto, setProveedorContacto] = useState("");
  const [provContactoEmail, setProvContactoEmail] = useState("");
  const [provContactoTelefono, setProvContactoTelefono] = useState("");

  // Renovation
  const [renovBusqueda, setRenovBusqueda] = useState("");
  const [renovResultados, setRenovResultados] = useState<any[]>([]);
  const [renovSeleccionada, setRenovSeleccionada] = useState<any | null>(null);
  const [renovDropdown, setRenovDropdown] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // DB search state
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [dbOpen, setDbOpen] = useState(false);
  const [dbSearched, setDbSearched] = useState(false);
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CIF duplicate warning for admin
  const [cifDuplicateWarning, setCifDuplicateWarning] = useState("");

  function fillCliente(c: any) {
    setClienteSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteEmail(c.email ?? "");
    setClienteTelefono(c.telefono ?? "");
    setClienteWeb(c.web ?? "");
    setClienteCif(c.cif ?? "");
    setClienteCnae(c.cnae ?? "");
    setClienteProvincia(c.provincia ?? "");
    setClienteDireccion(c.direccion ?? "");
    setEsNuevoCliente(false);
    const missing: string[] = [];
    if (!c.email) missing.push("email");
    if (!c.cif) missing.push("CIF");
    if (c.contacto_nombre) {
      setContactoNombre(c.contacto_nombre);
      setContactoEmail(c.contacto_email ?? "");
      setContactoTelefono(c.contacto_telefono ?? "");
    } else {
      setContactoNombre("");
      setContactoEmail("");
      setContactoTelefono("");
      missing.push("persona de contacto");
    }
    setClienteMissingData(missing);
  }

  function clearCliente() {
    setClienteSeleccionado(null);
    setEsNuevoCliente(false);
    setClienteEmail("");
    setClienteTelefono("");
    setClienteWeb("");
    setClienteCif("");
    setClienteCnae("");
    setClienteProvincia("");
    setClienteDireccion("");
    setClienteNombreComercial("");
    setContactoNombre("");
    setContactoEmail("");
    setContactoTelefono("");
    setClienteMissingData([]);
    setCifDuplicateWarning("");
  }

  function buscarCliente(q: string) {
    setClienteNombre(q);
    clearCliente();
    if (dbTimer.current) clearTimeout(dbTimer.current);
    if (q.length < 2) { setDbResults([]); setDbOpen(false); setDbSearched(false); return; }
    dbTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search/clientes?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setDbResults(data);
      setDbSearched(true);
      if (data.length === 0) {
        setDbOpen(false);
        setEsNuevoCliente(true);
      } else {
        setDbOpen(true);
      }
    }, 250);
  }

  function fillProveedor(p: any) {
    setProveedorSeleccionado(p);
    setProveedorNombre(p.nombre);
    setProveedorEmail(p.email ?? "");
    setProveedorTelefono(p.telefono ?? "");
    setProveedorWeb(p.web ?? "");
    setProveedorContacto(p.persona_contacto ?? "");
    setEsNuevoProveedor(false);
    const missing: string[] = [];
    if (!p.email) missing.push("email");
    setProveedorMissingData(missing);
  }

  function clearProveedor() {
    setProveedorSeleccionado(null);
    setEsNuevoProveedor(false);
    setProveedorEmail("");
    setProveedorTelefono("");
    setProveedorWeb("");
    setProveedorContacto("");
    setProvContactoEmail("");
    setProvContactoTelefono("");
    setProveedorMissingData([]);
  }

  // Check CIF globally when admin creates a new client
  async function checkCifGlobal(cif: string) {
    if (!cif || cif.length < 5) { setCifDuplicateWarning(""); return; }
    try {
      const res = await fetch("/api/search/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cif: cif.trim().toUpperCase() }),
      });
      if (res.ok) {
        const { exists, nombre } = await res.json();
        if (exists) {
          setCifDuplicateWarning(`Esta empresa (${nombre}) ya existe en la base de datos con CIF ${cif.trim().toUpperCase()}.`);
        } else {
          setCifDuplicateWarning("");
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!esRenovacion) return;
    if (renovTimer.current) clearTimeout(renovTimer.current);
    if (renovBusqueda.length < 2) { setRenovResultados([]); return; }
    renovTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/operations/search?q=${encodeURIComponent(renovBusqueda)}`);
      const data = await res.json();
      setRenovResultados(data);
      setRenovDropdown(true);
    }, 300);
  }, [renovBusqueda, esRenovacion]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    // Validation with descriptive errors
    const faltan: string[] = [];
    if (!data.collaborator_id) faltan.push("Colaborador asignado");
    if (!clienteNombre.trim()) faltan.push("Nombre de la empresa");
    if (pipeline === "consultoria" && !producto) faltan.push("Producto de financiación");
    if (pipeline === "consultoria" && producto === "Otro" && !data.producto_otro?.trim()) faltan.push("Descripción del producto");
    if (pipeline === "renting" && !data.equipo_tipo) faltan.push("Tipo de equipo");
    if (pipeline === "renting" && !data.plazo_meses) faltan.push("Plazo deseado");
    if (pipeline === "renting" && !proveedorNombre && !proformaFile) faltan.push("Proveedor o factura proforma");

    if (esNuevoCliente && !clienteCif.trim()) faltan.push("CIF de la empresa");

    if (faltan.length > 0) {
      setError(`Faltan campos obligatorios: ${faltan.join(", ")}.`);
      setLoading(false); return;
    }

    const productoFinal = producto === "Otro" ? (data.producto_otro?.trim() || "Otro") : producto;

    const res = await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        importe: importe || data.importe,
        pipeline_key: pipeline,
        producto: productoFinal,
        client_id: clienteSeleccionado?.id || null,
        cliente_nombre: clienteNombre,
        status: data.status || "activa",
        es_renovacion: esRenovacion,
        operacion_original_id: renovSeleccionada?.id ?? null,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
        cliente_web: clienteWeb || null,
        cliente_cif: clienteCif || null,
        cliente_cnae: clienteCnae || null,
        cliente_provincia: clienteProvincia || null,
        cliente_direccion: clienteDireccion || null,
        cliente_nombre_comercial: clienteNombreComercial || null,
        contacto_nombre: contactoNombre || null,
        contacto_email: contactoEmail || null,
        contacto_telefono: contactoTelefono || null,
        proveedor_nombre: proveedorNombre || null,
        proveedor_email: proveedorEmail || null,
        proveedor_telefono: proveedorTelefono || null,
        proveedor_web: proveedorWeb || null,
        proveedor_cif: proveedorCif || null,
        proveedor_cnae: proveedorCnae || null,
        proveedor_direccion: proveedorDireccion || null,
        proveedor_provincia: proveedorProvincia || null,
        proveedor_nombre_comercial: proveedorNombreComercial || null,
        proveedor_contacto_nombre: proveedorContacto || null,
        proveedor_contacto_email: provContactoEmail || null,
        proveedor_contacto_telefono: provContactoTelefono || null,
        ...(esRenovacion && renovSeleccionada?.client_nombre ? { cliente_nombre: renovSeleccionada.client_nombre } : {}),
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear la operación.");
      setLoading(false); return;
    }
    const op = await res.json();

    if (proformaFile && op?.id) {
      try {
        const fd = new FormData();
        fd.append("file", proformaFile);
        fd.append("folder", `Operaciones/${op.id}/Proformas`);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const { url, filename, size } = await upRes.json();
          await fetch(`/api/operations/${op.id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, filename, size }),
          });
        }
      } catch {}
    }

    setLoading(false);
    router.push(`/admin/operaciones/${op.id}`);
  }

  const clienteDisabled = !!(esRenovacion && renovSeleccionada?.client_nombre);

  function renderClienteSection() {
    if (clienteSeleccionado) {
      return (
        <div className="col-span-2">
          <label className={label}>Empresa cliente *</label>
          <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-[#2E1A47]">{clienteSeleccionado.nombre}</p>
              <p className="text-xs text-gray-500">{[clienteSeleccionado.codigo, clienteSeleccionado.cif, clienteSeleccionado.email].filter(Boolean).join(" · ")}</p>
            </div>
            <button type="button" onClick={() => { clearCliente(); setClienteNombre(""); }}
              className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
          </div>
          {clienteMissingData.length > 0 && (
            <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2">
              Faltan datos en la ficha del cliente: <span className="font-semibold">{clienteMissingData.join(", ")}</span>.
            </p>
          )}
        </div>
      );
    }

    if (esNuevoCliente) {
      return (
        <div className="col-span-2">
          <div className="border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nueva empresa cliente</p>
              <button type="button" onClick={() => { clearCliente(); setClienteNombre(""); }}
                className="text-xs text-gray-400 hover:text-red-500">✕ Cancelar</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <EmpresaSearchInput
                  value={clienteNombre}
                  onChange={setClienteNombre}
                  inp={inp}
                  labelCls={label}
                  onSelect={(data) => {
                    setClienteNombre(data.nombre);
                    setClienteCif(data.cif);
                    if (data.direccion) setClienteDireccion(data.direccion);
                    if (data.provincia) setClienteProvincia(data.provincia);
                    if (data.cnae) setClienteCnae(data.cnae_label ? `${data.cnae} - ${data.cnae_label}` : data.cnae);
                    if (data.telefono) setClienteTelefono(data.telefono);
                    if (data.email) setClienteEmail(data.email);
                    if (data.web) setClienteWeb(data.web);
                    if (data.cif) checkCifGlobal(data.cif);
                  }}
                  onCifDuplicate={(nombre) => {
                    setCifDuplicateWarning(`Esta empresa (${nombre}) ya existe en la base de datos.`);
                  }}
                />
              </div>
              <div>
                <label className={label}>CIF *</label>
                <input value={clienteCif} onChange={e => { setClienteCif(e.target.value); checkCifGlobal(e.target.value); }} className={inp} placeholder="B12345678" />
              </div>
              <div>
                <label className={label}>Nombre comercial</label>
                <input value={clienteNombreComercial} onChange={e => setClienteNombreComercial(e.target.value)} className={inp} placeholder="Nombre para identificar en la plataforma" />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="info@empresa.es" />
              </div>
              <div>
                <label className={label}>Dirección</label>
                <input value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} className={inp} placeholder="Calle, nº, CP, Ciudad" />
              </div>
              <div>
                <label className={label}>Provincia</label>
                <SearchableDropdown value={clienteProvincia} onChange={setClienteProvincia} inp={inp}
                  placeholder="Madrid" options={PROVINCIAS} />
              </div>
              <div>
                <label className={label}>CNAE</label>
                <input value={clienteCnae} onChange={e => setClienteCnae(e.target.value)} className={inp} placeholder="6201 - Consultoría informática" />
              </div>
              <div>
                <label className={label}>Teléfono</label>
                <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className={label}>Web</label>
                <input value={clienteWeb} onChange={e => setClienteWeb(e.target.value)} className={inp} placeholder="www.empresa.es" />
              </div>
            </div>
            {cifDuplicateWarning && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 px-3 py-2 font-semibold">
                {cifDuplicateWarning}
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Persona de contacto</p>
              <p className="text-xs text-gray-400 mb-3">Al menos un email o teléfono es obligatorio (aquí o en la ficha de empresa).</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={label}>Nombre</label>
                  <input value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} className={inp} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)} className={inp} placeholder="contacto@empresa.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input value={contactoTelefono} onChange={e => setContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: search field
    return (
      <div className="col-span-2 relative">
        <label className={label}>Empresa cliente *</label>
        <input name="cliente_nombre" value={clienteNombre} disabled={clienteDisabled}
          onChange={e => buscarCliente(e.target.value)}
          onBlur={() => setTimeout(() => setDbOpen(false), 200)}
          className={inp + (clienteDisabled ? " bg-gray-50 text-gray-500" : "")}
          placeholder="Escribe para buscar o añadir nueva empresa..." autoComplete="off" />
        {dbOpen && (
          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
            {dbResults.map((c: any) => (
              <button key={c.id} type="button"
                onMouseDown={() => { fillCliente(c); setDbResults([]); setDbOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{[c.codigo, c.cif, c.email].filter(Boolean).join(" · ")}</p>
              </button>
            ))}
            {dbSearched && clienteNombre.length >= 2 && (
              <button type="button" onMouseDown={() => { setEsNuevoCliente(true); setDbOpen(false); }}
                className="w-full text-left px-3 py-3 hover:bg-emerald-50 border-t border-gray-100 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2E1A47] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">+</span>
                <span className="text-sm font-semibold text-[#2E1A47]">Añadir &quot;{clienteNombre}&quot; como nueva empresa</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderProveedorSection() {
    if (proveedorSeleccionado) {
      return (
        <div className="col-span-2">
          <label className={label}>Proveedor</label>
          <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-[#2E1A47]">{proveedorSeleccionado.nombre}</p>
              <p className="text-xs text-gray-500">{[proveedorSeleccionado.codigo, proveedorSeleccionado.email].filter(Boolean).join(" · ")}</p>
            </div>
            <button type="button" onClick={() => { clearProveedor(); setProveedorNombre(""); }}
              className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
          </div>
          {proveedorMissingData.length > 0 && (
            <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2">
              Faltan datos en la ficha del proveedor: <span className="font-semibold">{proveedorMissingData.join(", ")}</span>.
            </p>
          )}
        </div>
      );
    }

    if (esNuevoProveedor) {
      return (
        <div className="col-span-2">
          <div className="border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nuevo proveedor</p>
              <button type="button" onClick={() => { clearProveedor(); setProveedorNombre(""); }}
                className="text-xs text-gray-400 hover:text-red-500">✕ Cancelar</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <EmpresaSearchInput
                  value={proveedorNombre}
                  onChange={setProveedorNombre}
                  inp={inp}
                  labelCls={label}
                  onSelect={(data) => {
                    setProveedorNombre(data.nombre);
                    if (data.telefono) setProveedorTelefono(data.telefono);
                    if (data.email) setProveedorEmail(data.email);
                    if (data.web) setProveedorWeb(data.web);
                    if (data.cif) setProveedorCif(data.cif);
                    if (data.cnae) setProveedorCnae(data.cnae);
                    if (data.direccion) setProveedorDireccion(data.direccion);
                    if (data.provincia) setProveedorProvincia(data.provincia);
                  }}
                  onCifDuplicate={() => {}}
                />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" value={proveedorEmail} onChange={e => setProveedorEmail(e.target.value)} className={inp} placeholder="info@proveedor.es" />
              </div>
              <div>
                <label className={label}>Teléfono</label>
                <input value={proveedorTelefono} onChange={e => setProveedorTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
              </div>
              <div>
                <label className={label}>Web</label>
                <input value={proveedorWeb} onChange={e => setProveedorWeb(e.target.value)} className={inp} placeholder="www.proveedor.es" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Persona de contacto <span className="text-gray-400 font-normal">(opcional)</span></p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={label}>Nombre</label>
                  <input value={proveedorContacto} onChange={e => setProveedorContacto(e.target.value)} className={inp} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input type="email" value={provContactoEmail} onChange={e => setProvContactoEmail(e.target.value)} className={inp} placeholder="contacto@proveedor.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input value={provContactoTelefono} onChange={e => setProvContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: search field for proveedores
    return (
      <div className="col-span-2">
        <ProveedorSearchField
          nombre={proveedorNombre}
          setNombre={setProveedorNombre}
          onSelect={fillProveedor}
          onNew={() => setEsNuevoProveedor(true)}
          inp={inp}
          labelCls={label}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 680 }}>
      <div className="mb-8 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">Crea una operación en nombre de un colaborador.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de operación */}
        <Section title="Tipo de operación *">
          <div className="grid grid-cols-2 gap-0 border border-gray-300">
            {(["consultoria", "renting"] as Pipeline[]).map((p, i) => (
              <button key={p} type="button" onClick={() => setPipeline(p)}
                className={`py-4 text-sm font-semibold transition-all ${i === 0 ? "border-r border-gray-300" : ""} ${
                  pipeline === p ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                {p === "consultoria" ? "Consultoría financiera" : "Renting de equipos"}
              </button>
            ))}
          </div>
        </Section>

        {/* Colaborador asignado */}
        <Section title="Colaborador asignado *">
          <select name="collaborator_id" className={inp}>
            <option value="">— Seleccionar colaborador —</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}{c.codigo ? ` (${c.codigo})` : ""}</option>
            ))}
          </select>
        </Section>

        {/* Estado inicial */}
        <Section title="Estado inicial">
          <select name="status" className={inp}>
            <option value="activa">Activa (directamente al funnel)</option>
            <option value="pendiente_de_validar">Pendiente de validar</option>
          </select>
        </Section>

        {/* ── CONSULTORÍA ── */}
        {pipeline === "consultoria" && (
          <>
            <Section title="Producto solicitado *">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCTOS_CONSULTORIA.map((p) => (
                  <label key={p}
                    className={`flex items-center gap-2 px-3 py-3 border text-sm cursor-pointer transition-all ${
                      producto === p ? "border-[#2E1A47] bg-[#EEEBF3] font-semibold text-[#2E1A47]" : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}>
                    <input type="radio" name="producto" value={p} className="accent-[#2E1A47]" onChange={() => setProducto(p)} />
                    {p}
                  </label>
                ))}
              </div>
              {producto === "Otro" && (
                <div className="mt-3">
                  <label className={label}>Describe qué necesita el cliente *</label>
                  <textarea name="producto_otro" rows={2} className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de financiación o producto que busca el cliente..." />
                </div>
              )}
            </Section>

            <Section title="¿Es una renovación?">
              <RenovacionBlock
                esRenovacion={esRenovacion} setEsRenovacion={setEsRenovacion}
                renovBusqueda={renovBusqueda} setRenovBusqueda={setRenovBusqueda}
                renovResultados={renovResultados} renovSeleccionada={renovSeleccionada}
                setRenovSeleccionada={setRenovSeleccionada} renovDropdown={renovDropdown}
                setRenovDropdown={setRenovDropdown} fillCliente={fillCliente}
                inp={inp} labelCls={label}
              />
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                {renderClienteSection()}
                <div>
                  <label className={label}>Importe (€)</label>
                  <input name="importe" type="text" inputMode="decimal"
                    value={focusedField === "importe-con" ? importe : fmtEuroInput(importe)}
                    onFocus={() => setFocusedField("importe-con")}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => { const v = focusedField ? e.target.value : rawFromFmt(e.target.value); setImporte(v); }}
                    className={inp} placeholder="50.000" />
                </div>
                {(clienteSeleccionado || !esNuevoCliente) && (
                  <>
                    <div>
                      <label className={label}>Email</label>
                      <input name="cliente_email" type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="contacto@empresa.es" />
                    </div>
                    <div>
                      <label className={label}>Teléfono</label>
                      <input name="cliente_telefono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                    </div>
                  </>
                )}
              </div>
              {!esNuevoCliente && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} className={inp} placeholder="Nombre" />
                    <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)} className={inp} placeholder="Email" />
                    <input value={contactoTelefono} onChange={e => setContactoTelefono(e.target.value)} className={inp} placeholder="Teléfono" />
                  </div>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── RENTING ── */}
        {pipeline === "renting" && (
          <>
            <Section title="Datos del equipo">
              <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
                {[
                  { val: "industrial", label: "Industrial", desc: "Maquinaria, vehículos, producción" },
                  { val: "tecnologico", label: "Tecnológico", desc: "IT, servidores, impresoras" },
                ].map((t, i) => (
                  <label key={t.val}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-all has-[:checked]:bg-[#EEEBF3] has-[:checked]:border-[#2E1A47] ${i === 0 ? "border-r border-gray-300" : ""}`}>
                    <input type="radio" name="equipo_tipo" value={t.val} className="mt-0.5 accent-[#2E1A47]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.label} *</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Importe (€) *</label>
                  <input name="importe" type="text" inputMode="decimal"
                    value={focusedField === "importe-ren" ? importe : fmtEuroInput(importe)}
                    onFocus={() => setFocusedField("importe-ren")}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => { const v = focusedField ? e.target.value : rawFromFmt(e.target.value); setImporte(v); }}
                    className={inp} placeholder="10.000" />
                </div>
                <div>
                  <label className={label}>Plazo deseado *</label>
                  <select name="plazo_meses" value={plazoMeses ?? ""} onChange={e => setPlazoMeses(e.target.value ? Number(e.target.value) : null)} className={inp}>
                    <option value="">Seleccionar</option>
                    {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                {importe && plazoMeses && (
                  <div className="col-span-2">
                    <CuotaEstimada importe={importe} plazo={plazoMeses} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className={label}>Lugar de instalación / entrega</label>
                  <input name="lugar_entrega" className={inp} placeholder="Dirección completa" />
                </div>
                <div className="col-span-2">
                  <label className={label}>Descripción del equipo a arrendar</label>
                  <textarea name="descripcion_equipo" rows={3} className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de equipo, marca, modelo, características técnicas..." />
                </div>
              </div>
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                {renderClienteSection()}
                {(clienteSeleccionado || !esNuevoCliente) && (
                  <>
                    <div>
                      <label className={label}>Email</label>
                      <input name="cliente_email" type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="info@empresa.es" />
                    </div>
                    <div>
                      <label className={label}>Teléfono</label>
                      <input name="cliente_telefono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                    </div>
                    <div>
                      <label className={label}>Web</label>
                      <input name="cliente_web" value={clienteWeb} onChange={e => setClienteWeb(e.target.value)} className={inp} placeholder="www.empresa.es" />
                    </div>
                  </>
                )}
              </div>
              {!esNuevoCliente && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} className={inp} placeholder="Nombre" />
                    <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)} className={inp} placeholder="Email" />
                    <input value={contactoTelefono} onChange={e => setContactoTelefono(e.target.value)} className={inp} placeholder="Teléfono" />
                  </div>
                </div>
              )}
            </Section>

            <Section title="Proveedor de los equipos">
              <p className="text-xs text-gray-500 mb-3">Selecciona un proveedor <strong>o</strong> sube una factura proforma. Al menos una de las dos opciones es obligatoria.</p>
              <div className="grid grid-cols-2 gap-4">
                {renderProveedorSection()}
                {(proveedorSeleccionado || !esNuevoProveedor) && proveedorSeleccionado && (
                  <>
                    <div>
                      <label className={label}>Email</label>
                      <input value={proveedorEmail} onChange={e => setProveedorEmail(e.target.value)} className={inp} placeholder="info@proveedor.es" />
                    </div>
                    <div>
                      <label className={label}>Teléfono</label>
                      <input value={proveedorTelefono} onChange={e => setProveedorTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                    </div>
                    <div>
                      <label className={label}>Web</label>
                      <input value={proveedorWeb} onChange={e => setProveedorWeb(e.target.value)} className={inp} placeholder="www.proveedor.es" />
                    </div>
                  </>
                )}
              </div>
              {proveedorSeleccionado && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto <span className="text-gray-400 font-normal">(opcional)</span></p>
                  <div className="grid grid-cols-3 gap-3">
                    <input value={proveedorContacto} onChange={e => setProveedorContacto(e.target.value)} className={inp} placeholder="Nombre" />
                    <input type="email" value={provContactoEmail} onChange={e => setProvContactoEmail(e.target.value)} className={inp} placeholder="Email" />
                    <input value={provContactoTelefono} onChange={e => setProvContactoTelefono(e.target.value)} className={inp} placeholder="Teléfono" />
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider mb-2">Factura proforma</p>
                {proformaFile ? (
                  <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 text-sm">📄</span>
                      <span className="text-sm text-emerald-800 font-medium">{proformaFile.name}</span>
                      <span className="text-xs text-gray-400">({(proformaFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button type="button" onClick={() => setProformaFile(null)} className="text-xs text-gray-400 hover:text-red-500">✕ Quitar</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#2E1A47] px-4 py-3 cursor-pointer transition-colors">
                    <span className="text-sm text-gray-500">Haz clic para subir la factura proforma</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={e => { if (e.target.files?.[0]) setProformaFile(e.target.files[0]); e.target.value = ""; }} />
                  </label>
                )}
                <p className="text-xs text-gray-400 mt-1">Si no tienes proveedor, sube la factura proforma del equipo.</p>
              </div>
            </Section>
          </>
        )}

        <Section title="Presentación de la operación">
          <textarea name="descripcion" rows={5} className={inp + " resize-y"}
            placeholder="Presenta la operación: contexto del cliente, situación financiera, motivo de la solicitud, urgencia, condiciones especiales..." />
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-3.5 text-sm font-bold hover:bg-[#5a3d80] transition-colors disabled:opacity-60">
          {loading ? "Creando operación..." : "Crear operación"}
        </button>
      </form>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}

function SearchableDropdown({ value, onChange, inp, placeholder, options }: {
  value: string; onChange: (v: string) => void; inp: string; placeholder: string; options: string[];
}) {
  const [open, setOpen] = useState(false);
  const filtered = value.length >= 1
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inp} placeholder={placeholder} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button"
              onMouseDown={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] text-sm border-b border-gray-50 last:border-0">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProveedorSearchField({ nombre, setNombre, onSelect, onNew, inp, labelCls }: {
  nombre: string; setNombre: (v: string) => void; onSelect: (p: any) => void; onNew: () => void;
  inp: string; labelCls: string;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    setNombre(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search/proveedores?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setSearched(true);
      if (data.length === 0) {
        setOpen(false);
        onNew();
      } else {
        setOpen(true);
      }
    }, 250);
  }

  return (
    <div className="relative">
      <label className={labelCls}>Nombre del proveedor</label>
      <input value={nombre}
        onChange={e => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={inp}
        placeholder="Escribe para buscar o añadir nuevo proveedor..." autoComplete="off" />
      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((p: any) => (
            <button key={p.id} type="button"
              onMouseDown={() => { onSelect(p); setResultados([]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[p.codigo, p.persona_contacto, p.email].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
          {searched && nombre.length >= 2 && (
            <button type="button" onMouseDown={onNew}
              className="w-full text-left px-3 py-3 hover:bg-emerald-50 border-t border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#2E1A47] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">+</span>
              <span className="text-sm font-semibold text-[#2E1A47]">Añadir &quot;{nombre}&quot; como nuevo proveedor</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RenovacionBlock({ esRenovacion, setEsRenovacion, renovBusqueda, setRenovBusqueda, renovResultados,
  renovSeleccionada, setRenovSeleccionada, renovDropdown, setRenovDropdown, fillCliente, inp, labelCls }: any) {
  return (
    <>
      <div className="border border-gray-200 divide-y divide-gray-100">
        <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
          <input type="radio" name="renovacion_tipo" value="nueva" defaultChecked className="mt-0.5 accent-[#2E1A47]"
            onChange={() => { setEsRenovacion(false); setRenovSeleccionada(null); setRenovBusqueda(""); }} />
          <div>
            <p className="text-sm font-semibold text-gray-800">Nueva operación</p>
            <p className="text-xs text-gray-400 mt-0.5">El cliente no ha operado con nosotros anteriormente para este producto.</p>
          </div>
        </label>
        <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
          <input type="radio" name="renovacion_tipo" value="renovacion" className="mt-0.5 accent-[#2E1A47]"
            onChange={() => setEsRenovacion(true)} />
          <div>
            <p className="text-sm font-semibold text-gray-800">Renovación de una operación anterior</p>
            <p className="text-xs text-gray-400 mt-0.5">Ya trabajamos con este cliente para este producto y vamos a renovar o ampliar.</p>
          </div>
        </label>
      </div>

      {esRenovacion && (
        <div className="mt-4 relative">
          <label className={labelCls}>Buscar operación original</label>
          {renovSeleccionada ? (
            <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[#2E1A47]">{renovSeleccionada.nombre ?? renovSeleccionada.client_nombre}</p>
                <p className="text-xs text-gray-500">{renovSeleccionada.codigo} · {renovSeleccionada.client_nombre}</p>
              </div>
              <button type="button" onClick={() => { setRenovSeleccionada(null); setRenovBusqueda(""); }}
                className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
            </div>
          ) : (
            <>
              <input value={renovBusqueda} onChange={e => setRenovBusqueda(e.target.value)}
                onFocus={() => renovResultados.length > 0 && setRenovDropdown(true)}
                onBlur={() => setTimeout(() => setRenovDropdown(false), 150)}
                className={inp} placeholder="Escribe el nombre del cliente o de la operación..." autoComplete="off" />
              {renovDropdown && renovResultados.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
                  {renovResultados.map((op: any) => (
                    <button key={op.id} type="button"
                      onMouseDown={() => {
                        setRenovSeleccionada(op);
                        if (op.client_nombre) fillCliente({ nombre: op.client_nombre, email: op.client_email, telefono: op.client_telefono, web: op.client_web });
                        setRenovBusqueda(""); setRenovDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                      <p className="text-sm font-semibold text-gray-800">{op.nombre ?? op.client_nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{op.codigo} · {op.client_nombre} · {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}</p>
                    </button>
                  ))}
                </div>
              )}
              {renovBusqueda.length >= 2 && renovResultados.length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">No se encontraron operaciones con ese nombre.</p>
              )}
            </>
          )}
          <input type="hidden" name="operacion_original_id" value={renovSeleccionada?.id ?? ""} />
        </div>
      )}
    </>
  );
}
