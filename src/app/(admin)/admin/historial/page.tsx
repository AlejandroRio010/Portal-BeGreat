import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { fmtEur } from "@/lib/format";
import HistorialTabla from "@/components/HistorialTabla";

export const dynamic = "force-dynamic";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function AdminHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; estado?: string; desde?: string; hasta?: string; colab?: string }>;
}) {
  const { tipo, estado, desde, hasta, colab } = await searchParams;

  const allOps = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      comision_origenes: operations.comision_origenes,
      colaboradores_comision: operations.colaboradores_comision,
      modalidad_renting: operations.modalidad_renting,
      importe_facturado_begreat: operations.importe_facturado_begreat,
      importe: operations.importe,
      created_at: operations.created_at,
      fecha_cierre: operations.fecha_cierre,
      client_nombre: clients.nombre,
      colaborador_id: collaborators.id,
      colaborador_nombre: collaborators.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(operations.fecha_cierre, operations.created_at);

  const colaboradoresLista = Array.from(
    new Map(allOps.filter(o => o.colaborador_id).map(o => [o.colaborador_id!, o.colaborador_nombre ?? "—"])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = allOps.filter((op) => {
    if (colab && colab !== "todos" && op.colaborador_id !== colab) return false;
    if (tipo && tipo !== "todas" && op.pipeline_key !== tipo) return false;
    if (estado && estado !== "todas") {
      const esFirmada = FIRMADAS.includes(op.fase ?? "");
      const esEstado =
        estado === "firmada" ? esFirmada :
        estado === "pendiente" ? op.status === "pendiente_de_validar" :
        estado === "activa" ? op.status === "activa" && !esFirmada :
        estado === "archivada" ? op.status === "archivada" && !esFirmada : true;
      if (!esEstado) return false;
    }
    if (desde && new Date(op.created_at) < new Date(desde)) return false;
    if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59); if (new Date(op.created_at) > h) return false; }
    return true;
  });

  const firmadas = allOps.filter((o) => FIRMADAS.includes(o.fase ?? ""));
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar" || (o.status === "activa" && !FIRMADAS.includes(o.fase ?? "")));
  const feeBegreat = firmadas.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);
  const feeColab = firmadas.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial & Resumen</h1>
        <p className="text-sm text-gray-400 mt-1">Todas las operaciones de todos los colaboradores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Ops firmadas</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee BeGreat cobrada</p>
            <p className="text-2xl font-black text-white leading-tight">{fmtEur(feeBegreat)}</p>
          </div>
        </div>
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">En estudio</p>
            <p className="text-3xl font-black text-[#2E1A47]">{pendientes.length}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee colaboradores</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{fmtEur(feeColab)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 p-5 mb-6">
        <form className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Colaborador</label>
            <select name="colab" defaultValue={colab ?? "todos"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todos">Todos</option>
              {colaboradoresLista.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
            <select name="tipo" defaultValue={tipo ?? "todas"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todas</option>
              <option value="consultoria">Consultoría</option>
              <option value="renting">Renting</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select name="estado" defaultValue={estado ?? "todas"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="activa">En estudio</option>
              <option value="firmada">Firmada</option>
              <option value="archivada">Denegada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <button type="submit" className="bg-[#2E1A47] text-white px-5 py-2 text-sm font-semibold hover:bg-[#5a3d80] transition-colors">Filtrar</button>
          {(tipo || estado || desde || hasta || colab) && (
            <Link href="/admin/historial" className="text-sm text-gray-400 hover:text-gray-600 py-2">Limpiar</Link>
          )}
        </form>
      </div>

      <HistorialTabla esAdmin hrefBase="/admin/operaciones" ops={filtered.map(o => {
        // Honorarios cobrados: suma de orígenes de comisión; en modalidad factura,
        // el margen (facturado − importe proveedor); si no, BeGreat + colaboradores
        type Origen = { importe?: string };
        type ColabCom = { id?: string; nombre?: string; importe?: string };
        const origenes = (o.comision_origenes as Origen[] | null) ?? [];
        const colabsCom = (o.colaboradores_comision as ColabCom[] | null) ?? [];
        const sumOrigenes = origenes.reduce((s, x) => s + (parseFloat(x.importe ?? "") || 0), 0);
        const bg = Number(o.comision_begreat ?? 0);
        const colabTotal = Number(o.comision_colaborador ?? 0);
        const esFactura = o.modalidad_renting === "begreat_factura" && o.importe_facturado_begreat && o.importe;
        const honorarios = sumOrigenes > 0
          ? sumOrigenes
          : esFactura ? Number(o.importe_facturado_begreat) - Number(o.importe)
          : bg + colabTotal;
        const colabLineas = colabsCom
          .map(c => ({ nombre: c.nombre?.trim() || "Colaborador", importe: parseFloat(c.importe ?? "") || 0 }))
          .filter(c => c.importe > 0);
        const desglose = honorarios > 0 || bg > 0 || colabTotal > 0
          ? [
              { nombre: "BeGreat", importe: bg },
              ...(colabLineas.length > 0
                ? colabLineas
                : colabTotal > 0
                  ? [{ nombre: o.colaborador_nombre ?? "Colaborador", importe: colabTotal }]
                  : []),
            ]
          : null;
        return {
          id: o.id, nombre: o.nombre, client_nombre: o.client_nombre, pipeline_key: o.pipeline_key,
          fase: o.fase, status: o.status, fecha_cierre: o.fecha_cierre, created_at: o.created_at,
          comision_colaborador: o.comision_colaborador, comision_begreat: o.comision_begreat,
          colaborador_nombre: o.colaborador_nombre,
          honorarios, desglose,
        };
      })} />
    </div>
  );
}
