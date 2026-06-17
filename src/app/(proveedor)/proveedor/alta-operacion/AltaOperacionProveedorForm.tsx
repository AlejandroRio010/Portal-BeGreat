"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";
import { fmtEuroInput, rawFromFmt } from "@/lib/format";

const PLAZOS = [12, 24, 36, 48, 60, 72];

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

const PROVINCIAS = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz",
  "Barcelona","Bizkaia","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta",
  "Ciudad Real","Córdoba","Cuenca","Gipuzkoa","Girona","Granada","Guadalajara",
  "Huelva","Huesca","Illes Balears","Jaén","La Rioja","Las Palmas","León","Lleida",
  "Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia",
  "Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria",
  "Tarragona","Teruel","Toledo","Valencia","Valladolid","Zamora","Zaragoza",
];

const CNAE_CODES = [
  "0111 Cultivo de cereales","0113 Cultivo de hortalizas","0121 Cultivo de uva","0141 Explotación de ganado bovino",
  "0150 Producción agrícola combinada","0210 Silvicultura","0311 Pesca marina","0321 Acuicultura marina",
  "1011 Procesado de carne","1020 Procesado de pescado","2611 Fabricación de componentes electrónicos",
  "2620 Fabricación de ordenadores","4511 Venta de automóviles","4621 Comercio al por mayor de cereales",
  "4651 Comercio al por mayor de equipos para TIC","4711 Comercio al por menor en establecimientos no especializados",
  "4741 Comercio al por menor de ordenadores y software","4941 Transporte de mercancías por carretera",
  "5510 Hoteles y alojamientos similares","5610 Restaurantes y puestos de comidas",
  "6201 Actividades de programación informática","6202 Actividades de consultoría informática",
  "6311 Proceso de datos, hosting","6810 Compraventa de bienes inmobiliarios",
  "6910 Actividades jurídicas","6920 Actividades de contabilidad y auditoría",
  "7022 Otras actividades de consultoría de gestión empresarial","7111 Servicios técnicos de arquitectura",
  "7112 Servicios técnicos de ingeniería","7311 Agencias de publicidad",
  "8510 Educación preprimaria","8610 Actividades hospitalarias",
];

type CatalogoProducto = { id: string; nombre: string; tipo: string | null; precio_venta: string | null };
type LineaProducto = { id?: string; nombre: string; precioUnitario: number; unidades: number; fromCatalog: boolean };

export default function AltaOperacionProveedorForm({ catalogoProductos = [] }: { catalogoProductos?: CatalogoProducto[] }) {
  const router = useRouter();

  // Client state
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteWeb, setClienteWeb] = useState("");
  const [clienteCif, setClienteCif] = useState("");
  const [clienteCnae, setClienteCnae] = useState("");
  const [clienteProvincia, setClienteProvincia] = useState("");
  const [clienteNombreComercial, setClienteNombreComercial] = useState("");
  const [esNuevoCliente, setEsNuevoCliente] = useState(false);
  const [clienteMissingData, setClienteMissingData] = useState<string[]>([]);

  // Contact state
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoPuesto, setContactoPuesto] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  // Product mode: "catalogo" | "manual" | "total"
  const [modoProducto, setModoProducto] = useState<"catalogo" | "manual" | "total">(catalogoProductos.length > 0 ? "catalogo" : "total");
  const [lineas, setLineas] = useState<LineaProducto[]>([]);
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualUnidades, setManualUnidades] = useState("1");
  const [importeTotal, setImporteTotal] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const importeCalculado = lineas.reduce((s, l) => s + l.precioUnitario * l.unidades, 0);

  function addFromCatalog(p: CatalogoProducto) {
    setLineas(prev => [...prev, { id: p.id, nombre: p.nombre, precioUnitario: Number(p.precio_venta ?? 0), unidades: 1, fromCatalog: true }]);
  }

  function addManual() {
    if (!manualNombre.trim() || !manualPrecio) return;
    setLineas(prev => [...prev, { nombre: manualNombre.trim(), precioUnitario: Number(manualPrecio), unidades: Number(manualUnidades) || 1, fromCatalog: false }]);
    setManualNombre("");
    setManualPrecio("");
    setManualUnidades("1");
  }

  function removeLinea(idx: number) {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fillCliente(c: any) {
    setClienteSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteEmail(c.email ?? "");
    setClienteTelefono(c.telefono ?? "");
    setClienteWeb(c.web ?? "");
    setClienteCif(c.cif ?? "");
    setClienteCnae(c.cnae ?? "");
    setEsNuevoCliente(false);

    const missing: string[] = [];
    if (!c.email) missing.push("email");
    if (!c.cif) missing.push("CIF");

    if (c.contacto_nombre) {
      setContactoNombre(c.contacto_nombre);
      setContactoEmail(c.contacto_email ?? "");
      setContactoTelefono(c.contacto_telefono ?? "");
      setContactoPuesto(c.contacto_puesto ?? "");
    } else {
      setContactoNombre("");
      setContactoEmail("");
      setContactoTelefono("");
      setContactoPuesto("");
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
    setClienteNombreComercial("");
    setContactoNombre("");
    setContactoPuesto("");
    setContactoEmail("");
    setContactoTelefono("");
    setClienteMissingData([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    const faltan: string[] = [];
    if (!clienteSeleccionado && !esNuevoCliente) {
      setError("Busca y selecciona una empresa cliente, o da de alta una nueva.");
      setLoading(false); return;
    }
    if (!clienteNombre.trim()) faltan.push("Nombre de la empresa");
    const importeFinal = modoProducto === "total" ? importeTotal : String(importeCalculado);
    if (modoProducto === "total" && !importeTotal) faltan.push("Importe total (€)");
    if (modoProducto !== "total" && lineas.length === 0) faltan.push("Al menos un producto");
    if (!data.equipo_tipo) faltan.push("Tipo de equipo");
    if (!data.plazo_meses) faltan.push("Plazo deseado");

    if (esNuevoCliente) {
      if (!clienteCif.trim()) faltan.push("CIF de la empresa");
      const tieneContacto = !!(contactoEmail.trim() || contactoTelefono.trim());
      const tieneEmpresa = !!(clienteEmail.trim() || clienteTelefono.trim());
      if (!tieneContacto && !tieneEmpresa) {
        faltan.push("Email o teléfono (de la empresa o de la persona de contacto)");
      }
    }

    if (faltan.length > 0) {
      setError(`Faltan campos obligatorios: ${faltan.join(", ")}.`);
      setLoading(false); return;
    }

    const res = await fetch("/api/proveedor/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        importe: importeFinal,
        lineas_productos: modoProducto !== "total" ? lineas : undefined,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
        cliente_web: clienteWeb || null,
        cliente_cif: clienteCif || null,
        cliente_cnae: clienteCnae || null,
        cliente_provincia: clienteProvincia || null,
        cliente_nombre_comercial: clienteNombreComercial || null,
        es_nuevo_cliente: esNuevoCliente,
        contacto_nombre: contactoNombre || null,
        contacto_puesto: contactoPuesto || null,
        contacto_email: contactoEmail || null,
        contacto_telefono: contactoTelefono || null,
        contacto_directo: data.contacto_directo,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Error al enviar la operación. Inténtalo de nuevo.");
      return;
    }
    router.push("/proveedor/operaciones/renting");
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 680 }}>
      <div className="mb-8 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">
          La operación se publicará directamente en tu{" "}
          <span className="inline-block bg-[#EEEBF3] text-[#2E1A47] text-xs font-semibold px-2 py-0.5">
            Funnel de renting
          </span>.
        </p>
        <p className="text-xs text-gray-400 mt-2">El nombre de la operación se genera automáticamente: <span className="font-semibold text-gray-500">Empresa — OP N</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del cliente */}
        <Section title="Datos del cliente">
          <ClienteSection
            clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
            clienteEmail={clienteEmail} setClienteEmail={setClienteEmail}
            clienteTelefono={clienteTelefono} setClienteTelefono={setClienteTelefono}
            clienteWeb={clienteWeb} setClienteWeb={setClienteWeb}
            clienteCif={clienteCif} setClienteCif={setClienteCif}
            clienteCnae={clienteCnae} setClienteCnae={setClienteCnae}
            clienteProvincia={clienteProvincia} setClienteProvincia={setClienteProvincia}
            clienteNombreComercial={clienteNombreComercial} setClienteNombreComercial={setClienteNombreComercial}
            clienteSeleccionado={clienteSeleccionado}
            esNuevoCliente={esNuevoCliente} setEsNuevoCliente={setEsNuevoCliente}
            clienteMissingData={clienteMissingData}
            onSelect={fillCliente} onClear={clearCliente}
            contactoNombre={contactoNombre} setContactoNombre={setContactoNombre}
            contactoPuesto={contactoPuesto} setContactoPuesto={setContactoPuesto}
            contactoEmail={contactoEmail} setContactoEmail={setContactoEmail}
            contactoTelefono={contactoTelefono} setContactoTelefono={setContactoTelefono}
            inp={inp} labelCls={labelCls}
          />
        </Section>

        {/* Datos del equipo */}
        <Section title="Datos del equipo">
          <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
            {[
              { val: "industrial", label: "Industrial", desc: "Maquinaria, vehículos, producción" },
              { val: "tecnologico", label: "Tecnológico", desc: "IT, servidores, impresoras" },
            ].map((t, i) => (
              <label key={t.val} className={`flex items-start gap-3 p-4 cursor-pointer transition-all has-[:checked]:bg-[#EEEBF3] has-[:checked]:border-[#2E1A47] ${i === 0 ? "border-r border-gray-300" : ""}`}>
                <input type="radio" name="equipo_tipo" value={t.val} className="mt-0.5 accent-[#2E1A47]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.label} *</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Modo de producto */}
          <div className="mb-4">
            <label className={labelCls}>¿Cómo quieres detallar el equipo? *</label>
            <div className={`grid gap-0 border border-gray-300 ${catalogoProductos.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              {catalogoProductos.length > 0 && (
                <label className={`flex items-start gap-2 p-3 cursor-pointer transition-all text-center ${modoProducto === "catalogo" ? "bg-[#EEEBF3] border-[#2E1A47]" : ""} border-r border-gray-300`}>
                  <input type="radio" checked={modoProducto === "catalogo"} onChange={() => setModoProducto("catalogo")} className="mt-0.5 accent-[#2E1A47]" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Mi catálogo</p>
                    <p className="text-[10px] text-gray-400">{catalogoProductos.length} productos</p>
                  </div>
                </label>
              )}
              <label className={`flex items-start gap-2 p-3 cursor-pointer transition-all ${modoProducto === "manual" ? "bg-[#EEEBF3]" : ""} border-r border-gray-300`}>
                <input type="radio" checked={modoProducto === "manual"} onChange={() => setModoProducto("manual")} className="mt-0.5 accent-[#2E1A47]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Otros productos</p>
                  <p className="text-[10px] text-gray-400">Nombre y precio</p>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-3 cursor-pointer transition-all ${modoProducto === "total" ? "bg-[#EEEBF3]" : ""}`}>
                <input type="radio" checked={modoProducto === "total"} onChange={() => setModoProducto("total")} className="mt-0.5 accent-[#2E1A47]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Importe total</p>
                  <p className="text-[10px] text-gray-400">Sin detallar</p>
                </div>
              </label>
            </div>
          </div>

          {/* Catálogo */}
          {modoProducto === "catalogo" && (
            <div className="mb-4 border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selecciona productos de tu catálogo</p>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                {catalogoProductos.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                        <p className="text-xs text-gray-400">{p.tipo ?? ""} · {Number(p.precio_venta ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €/ud.</p>
                      </div>
                      <input type="number" min="1" defaultValue="1" id={`cat-qty-${p.id}`}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 text-center focus:outline-none focus:border-[#2E1A47]" />
                      <button type="button"
                        onClick={() => {
                          const qty = Number((document.getElementById(`cat-qty-${p.id}`) as HTMLInputElement)?.value) || 1;
                          setLineas(prev => [...prev, { id: p.id, nombre: p.nombre, precioUnitario: Number(p.precio_venta ?? 0), unidades: qty, fromCatalog: true }]);
                        }}
                        className="px-3 py-1 text-xs font-semibold bg-[#2E1A47] text-white hover:bg-[#3d2460] whitespace-nowrap">
                        + Añadir
                      </button>
                    </div>
                  ))}
              </div>
              {catalogoProductos.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No tienes productos en tu catálogo. Añádelos desde tu perfil.</p>
              )}
            </div>
          )}

          {/* Manual */}
          {modoProducto === "manual" && (
            <div className="mb-4 border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Añadir producto</p>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input value={manualNombre} onChange={e => setManualNombre(e.target.value)}
                    className={inp} placeholder="Nombre del producto" />
                </div>
                <div>
                  <label className={labelCls}>Precio ud. €</label>
                  <input value={focusedField === "manualPrecio" ? manualPrecio : fmtEuroInput(manualPrecio)}
                    onFocus={() => setFocusedField("manualPrecio")}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => {
                      const v = focusedField ? e.target.value : rawFromFmt(e.target.value);
                      setManualPrecio(v);
                    }}
                    type="text" inputMode="decimal" className={inp + " w-28"} placeholder="0,00 €" />
                </div>
                <div>
                  <label className={labelCls}>Uds.</label>
                  <input value={manualUnidades} onChange={e => setManualUnidades(e.target.value)}
                    type="number" min="1" className={inp + " w-20"} />
                </div>
                <button type="button" onClick={addManual}
                  disabled={!manualNombre.trim() || !manualPrecio}
                  className="px-4 py-2.5 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] disabled:opacity-50 whitespace-nowrap">
                  + Añadir
                </button>
              </div>
            </div>
          )}

          {/* Lista de productos añadidos */}
          {modoProducto !== "total" && lineas.length > 0 && (
            <div className="mb-4 border border-gray-200">
              <div className="bg-[#EEEBF3] px-4 py-2 flex items-center justify-between">
                <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Productos añadidos</p>
                <p className="text-sm font-bold text-[#2E1A47]">Total: {importeCalculado.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</p>
              </div>
              <div className="divide-y divide-gray-50">
                {lineas.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm text-gray-800">{l.nombre}</p>
                      <p className="text-xs text-gray-400">{l.unidades} ud. × {l.precioUnitario.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € · {l.fromCatalog ? "Catálogo" : "Manual"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-700">{(l.precioUnitario * l.unidades).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</p>
                      <button type="button" onClick={() => removeLinea(i)}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Importe total directo */}
          {modoProducto === "total" && (
            <div className="mb-4">
              <label className={labelCls}>Importe venta total (sin IVA) * €</label>
              <input value={focusedField === "importeTotal" ? importeTotal : fmtEuroInput(importeTotal)}
                onFocus={() => setFocusedField("importeTotal")}
                onBlur={() => setFocusedField(null)}
                onChange={e => {
                  const v = focusedField ? e.target.value : rawFromFmt(e.target.value);
                  setImporteTotal(v);
                }}
                type="text" inputMode="decimal" className={inp} placeholder="10.000,00 €" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Plazo deseado *</label>
              <select name="plazo_meses" className={inp}>
                <option value="">Seleccionar</option>
                {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Lugar de instalación / entrega</label>
              <input name="lugar_entrega" className={inp} placeholder="Dirección completa" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Descripción del equipo</label>
              <textarea name="descripcion_equipo" rows={3} className={inp + " resize-none"}
                placeholder="Describe brevemente el tipo de equipo, marca, modelo, características técnicas..." />
            </div>
          </div>
        </Section>

        <Section title="Presentación de la operación">
          <textarea name="descripcion" rows={4} className={inp + " resize-y"}
            placeholder="Contexto del cliente, situación, motivo de la solicitud, condiciones especiales..." />
        </Section>

        <Section title="Preferencia de comunicación con el cliente">
          <div className="border border-gray-200 divide-y divide-gray-100">
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="false" defaultChecked className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Yo gestiono la comunicación con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat me mantendrá informado del avance.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="true" className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Autorizo a BeGreat a contactar directamente con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat gestionará el contacto en tu nombre.</p>
              </div>
            </label>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3.5 text-sm font-bold transition-colors disabled:opacity-60 bg-[#2E1A47] text-white hover:bg-[#5a3d80]">
          {loading ? "Enviando operación..." : "Enviar operación a BeGreat"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}

function CnaeSearchInput({ value, onChange, inp: inpCls, placeholder, options, isCnae }: {
  value: string; onChange: (v: string) => void; inp: string; placeholder: string; options: string[]; isCnae?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const source = isCnae ? CNAE_CODES : options;
  const filtered = value.length >= 1
    ? source.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inpCls} placeholder={placeholder} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button"
              onMouseDown={() => { onChange(isCnae ? o.split(" ")[0] : o); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] text-sm border-b border-gray-50 last:border-0">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchableField({ value, onChange, onSelect, onNew, placeholder, searchUrl, nameField, label, inp: inpCls, labelCls: lCls, disabled, autoNewWhenEmpty = false }: {
  value: string; onChange: (v: string) => void; onSelect: (item: any) => void; onNew: () => void;
  placeholder: string; searchUrl: string; nameField: string; label: string;
  inp: string; labelCls: string; disabled?: boolean; autoNewWhenEmpty?: boolean;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    onChange(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setSearched(true);
      if (data.length === 0 && autoNewWhenEmpty) {
        setOpen(false);
        onNew();
      } else {
        setOpen(true);
      }
    }, 250);
  }

  return (
    <div className="relative">
      <label className={lCls}>{label}</label>
      <input name={nameField} value={value} disabled={disabled}
        onChange={e => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={inpCls + (disabled ? " bg-gray-50 text-gray-500" : "")}
        placeholder={placeholder} autoComplete="off" />
      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((c: any) => (
            <button key={c.id} type="button"
              onMouseDown={() => { onSelect(c); setResultados([]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[c.codigo, c.cif, c.email].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
          {searched && value.length >= 2 && (
            <button type="button" onMouseDown={onNew}
              className="w-full text-left px-3 py-3 hover:bg-emerald-50 border-t border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#2E1A47] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">+</span>
              <span className="text-sm font-semibold text-[#2E1A47]">Añadir &quot;{value}&quot; como nueva empresa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ClienteSection({ clienteNombre, setClienteNombre, clienteEmail, setClienteEmail, clienteTelefono, setClienteTelefono,
  clienteWeb, setClienteWeb, clienteCif, setClienteCif, clienteCnae, setClienteCnae, clienteProvincia, setClienteProvincia,
  clienteNombreComercial, setClienteNombreComercial,
  clienteSeleccionado, esNuevoCliente, setEsNuevoCliente,
  clienteMissingData, onSelect, onClear, contactoNombre, setContactoNombre, contactoPuesto, setContactoPuesto,
  contactoEmail, setContactoEmail, contactoTelefono, setContactoTelefono, inp: inpCls, labelCls: lCls,
}: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {clienteSeleccionado ? (
          <div className="col-span-2">
            <label className={lCls}>Empresa cliente *</label>
            <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[#2E1A47]">{clienteSeleccionado.nombre}</p>
                <p className="text-xs text-gray-500">{[clienteSeleccionado.codigo, clienteSeleccionado.email].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => { onClear(); setClienteNombre(""); }}
                className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
            </div>
            {clienteMissingData.length > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2">
                Faltan datos por añadir en la ficha del cliente: <span className="font-semibold">{clienteMissingData.join(", ")}</span>.
              </p>
            )}
          </div>
        ) : esNuevoCliente ? (
          <div className="col-span-2">
            <div className="border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nueva empresa cliente</p>
                <button type="button" onClick={() => { onClear(); setClienteNombre(""); }}
                  className="text-xs text-gray-400 hover:text-red-500">✕ Cancelar</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <EmpresaSearchInput
                    value={clienteNombre}
                    onChange={setClienteNombre}
                    inp={inpCls}
                    labelCls={lCls}
                    onSelect={(data) => {
                      setClienteNombre(data.nombre);
                      setClienteCif(data.cif);
                      if (data.provincia) setClienteProvincia(data.provincia);
                      if (data.cnae) setClienteCnae(data.cnae_label ? `${data.cnae} - ${data.cnae_label}` : data.cnae);
                      if (data.telefono) setClienteTelefono(data.telefono);
                      if (data.email) setClienteEmail(data.email);
                      if (data.web) setClienteWeb(data.web);
                    }}
                    onCifDuplicate={() => {}}
                  />
                </div>
                <div>
                  <label className={lCls}>CIF *</label>
                  <input value={clienteCif} onChange={e => setClienteCif(e.target.value)} className={inpCls} placeholder="B12345678" />
                </div>
                <div>
                  <label className={lCls}>Nombre comercial</label>
                  <input value={clienteNombreComercial} onChange={e => setClienteNombreComercial(e.target.value)} className={inpCls} placeholder="Nombre para identificar" />
                </div>
                <div>
                  <label className={lCls}>Email</label>
                  <input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inpCls} placeholder="info@empresa.es" />
                </div>
                <div>
                  <label className={lCls}>Provincia</label>
                  <CnaeSearchInput value={clienteProvincia} onChange={setClienteProvincia} inp={inpCls}
                    placeholder="Madrid" options={PROVINCIAS} />
                </div>
                <div>
                  <label className={lCls}>CNAE</label>
                  <CnaeSearchInput value={clienteCnae} onChange={setClienteCnae} inp={inpCls}
                    placeholder="Buscar por código o actividad..." options={[]} isCnae />
                </div>
                <div>
                  <label className={lCls}>Teléfono</label>
                  <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inpCls} placeholder="+34 600 000 000" />
                </div>
                <div>
                  <label className={lCls}>Web</label>
                  <input value={clienteWeb} onChange={e => setClienteWeb(e.target.value)} className={inpCls} placeholder="www.empresa.es" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Persona de contacto</p>
                <p className="text-xs text-gray-400 mb-3">Al menos un email o teléfono es obligatorio (aquí o en la ficha de empresa).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lCls}>Nombre</label>
                    <input value={contactoNombre} onChange={(e: any) => setContactoNombre(e.target.value)} className={inpCls} placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className={lCls}>Puesto</label>
                    <input value={contactoPuesto} onChange={(e: any) => setContactoPuesto(e.target.value)} className={inpCls} placeholder="Director financiero" />
                  </div>
                  <div>
                    <label className={lCls}>Email</label>
                    <input type="email" value={contactoEmail} onChange={(e: any) => setContactoEmail(e.target.value)} className={inpCls} placeholder="contacto@empresa.es" />
                  </div>
                  <div>
                    <label className={lCls}>Teléfono</label>
                    <input value={contactoTelefono} onChange={(e: any) => setContactoTelefono(e.target.value)} className={inpCls} placeholder="612 345 678" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-2">
            <SearchableField value={clienteNombre} onChange={(v) => { setClienteNombre(v); onClear(); }}
              onSelect={onSelect}
              onNew={() => setEsNuevoCliente(true)}
              placeholder="Escribe para buscar o añadir nueva empresa..."
              searchUrl="/api/search/clientes" nameField="cliente_nombre"
              label="Empresa cliente *" inp={inpCls} labelCls={lCls}
              autoNewWhenEmpty />
          </div>
        )}
      </div>

      {clienteSeleccionado && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lCls}>Nombre</label>
              <input value={contactoNombre} onChange={(e: any) => setContactoNombre(e.target.value)} className={inpCls} placeholder="Nombre" />
            </div>
            <div>
              <label className={lCls}>Puesto</label>
              <input value={contactoPuesto} onChange={(e: any) => setContactoPuesto(e.target.value)} className={inpCls} placeholder="Director financiero" />
            </div>
            <div>
              <label className={lCls}>Email</label>
              <input type="email" value={contactoEmail} onChange={(e: any) => setContactoEmail(e.target.value)} className={inpCls} placeholder="contacto@empresa.es" />
            </div>
            <div>
              <label className={lCls}>Teléfono</label>
              <input value={contactoTelefono} onChange={(e: any) => setContactoTelefono(e.target.value)} className={inpCls} placeholder="612 345 678" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
