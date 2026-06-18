import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { fmtEur } from "@/lib/format";
import HistorialTabla from "@/components/HistorialTabla";

export const dynamic = "force-dynamic";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; desde?: string; hasta?: string }>;
}) {
  const { estado, desde, hasta } = await searchParams;
  const session = await auth();
  const supplierId = (session!.user as any).supplierId as string;

  const allOps = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      equipo_tipo: operations.equipo_tipo,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      created_at: operations.created_at,
      fecha_cierre: operations.fecha_cierre,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.supplier_id, supplierId))
    .orderBy(operations.fecha_cierre, operations.created_at);

  // Filters
  const filtered = allOps.filter((op) => {
    if (estado && estado !== "todas") {
      const esFirmada = op.fase === "Contrato firmado" || op.fase === "Honorarios pagados" || op.fase === "Transferencia realizada";
      const esEstado =
        estado === "firmada" ? esFirmada :
        estado === "pendiente" ? op.status === "pendiente_de_validar" :
        estado === "activa" ? op.status === "activa" && !esFirmada :
        estado === "archivada" ? op.status === "archivada" : true;
      if (!esEstado) return false;
    }
    if (desde) {
      const desdeDate = new Date(desde);
      if (new Date(op.created_at) < desdeDate) return false;
    }
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59);
      if (new Date(op.created_at) > hastaDate) return false;
    }
    return true;
  });

  // Stats (always on all ops, not filtered)
  const firmadas = allOps.filter((o) => o.fase === "Contrato firmado" || o.fase === "Honorarios pagados" || o.fase === "Transferencia realizada");
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar" || (o.status === "activa" && o.fase !== "Contrato firmado" && o.fase !== "Honorarios pagados" && o.fase !== "Transferencia realizada"));
  const totalVendido = firmadas.reduce((sum, o) => sum + (o.importe ? Number(o.importe) : 0), 0);
  const importePendiente = pendientes.reduce((sum, o) => sum + (o.importe ? Number(o.importe) : 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial & Resumen</h1>
        <p className="text-sm text-gray-400 mt-1">Todas tus operaciones con BeGreat</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {/* Pareja 1: oscura */}
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Ops. firmadas</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Importe vendido</p>
            <p className="text-2xl font-black text-white leading-tight">{fmtEur(totalVendido)}</p>
          </div>
        </div>
        {/* Pareja 2: clara */}
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">En estudio</p>
            <p className="text-3xl font-black text-[#2E1A47]">{pendientes.length}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Importe pendiente</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{fmtEur(importePendiente)}</p>
          </div>
        </div>
      </div>

      {/* Filters — no "tipo" filter since proveedor only sees renting */}
      <div className="bg-white rounded-sm border border-gray-100 p-5 mb-6">
        <form className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select name="estado" defaultValue={estado ?? "todas"} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todos</option>
              <option value="pendiente">Pendiente de validar</option>
              <option value="activa">En estudio</option>
              <option value="firmada">Firmada</option>
              <option value="archivada">Denegada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <button type="submit" className="bg-[#2E1A47] text-white px-5 py-2 rounded-sm text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
            Filtrar
          </button>
          {(estado || desde || hasta) && (
            <Link href="/proveedor/historial" className="text-sm text-gray-400 hover:text-gray-600 py-2">
              Limpiar filtros
            </Link>
          )}
        </form>
      </div>

      <HistorialTabla esAdmin={false} ocultarComisiones hrefBase="/proveedor/operaciones" ops={filtered.map(o => ({
        id: o.id, nombre: o.nombre, client_nombre: o.client_nombre, pipeline_key: o.pipeline_key,
        fase: o.fase, status: o.status, fecha_cierre: o.fecha_cierre, created_at: o.created_at,
        comision_colaborador: null, comision_begreat: null,
      }))} />
    </div>
  );
}
