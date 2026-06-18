"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashTask = {
  id: string;
  titulo: string;
  asignado_a?: string;
  created_at: string;
  operation_id: string;
  op_nombre: string | null;
  op_codigo: string | null;
};

export default function PendingTasksWidget({ basePath }: { basePath: string }) {
  const [tasks, setTasks] = useState<DashTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  function daysAgo(d: string) {
    return Math.round((Date.now() - new Date(d).getTime()) / 86400000);
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-5">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
          Mis tareas pendientes
        </p>
        <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Mis tareas pendientes
        {tasks.length > 0 && (
          <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle">
            {tasks.length}
          </span>
        )}
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin tareas pendientes</p>
      ) : (
        <div className="space-y-1">
          {tasks.slice(0, 10).map((t) => {
            const days = daysAgo(t.created_at);
            return (
              <Link
                key={t.id}
                href={`${basePath}/operaciones/${t.operation_id}`}
                className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 group"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.asignado_a === "cliente" ? "bg-amber-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {t.asignado_a === "cliente" && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 mr-1.5 uppercase">Cliente</span>}
                    {t.titulo}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {t.op_codigo ?? t.op_nombre ?? "Operación"}
                  </p>
                </div>
                <span className={`text-[10px] font-medium flex-shrink-0 ${days > 3 ? "text-red-500" : "text-gray-400"}`}>
                  {days === 0 ? "hoy" : `hace ${days}d`}
                </span>
              </Link>
            );
          })}
          {tasks.length > 10 && (
            <p className="text-[10px] text-gray-400 text-center pt-2">
              +{tasks.length - 10} más
            </p>
          )}
        </div>
      )}
    </div>
  );
}
