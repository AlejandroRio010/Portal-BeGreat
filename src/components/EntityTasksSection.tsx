"use client";

import { useState } from "react";

type Task = {
  id: string;
  titulo: string;
  asignado_a_nombre: string | null;
  completada: boolean;
  created_at: string;
  completed_at: string | null;
  fecha_programada: string | null;
};

export default function EntityTasksSection({
  initialTasks,
  apiUrl,
  assignees,
  readOnly = false,
}: {
  initialTasks: Task[];
  apiUrl: string;
  assignees: { id: string; nombre: string }[];
  readOnly?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [titulo, setTitulo] = useState("");
  const [asignadoNombre, setAsignadoNombre] = useState(assignees[0]?.nombre ?? "");
  const [adding, setAdding] = useState(false);

  async function addTask() {
    if (!titulo.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, asignado_a_nombre: asignadoNombre || null }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [...prev, task]);
        setTitulo("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleTask(taskId: string, completada: boolean) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completada, completed_at: completada ? new Date().toISOString() : null } : t
      )
    );
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, completada }),
    });
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(apiUrl, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
  }

  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduling, setScheduling] = useState(false);

  async function scheduleReminder(taskId: string) {
    if (!scheduleDate) return;
    setScheduling(true);
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, fecha_programada: scheduleDate }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, fecha_programada: new Date(scheduleDate).toISOString() } : t
          )
        );
        setSchedulingTaskId(null);
        setScheduleDate("");
      }
    } finally {
      setScheduling(false);
    }
  }

  const pending = tasks.filter((t) => !t.completada);
  const done = tasks.filter((t) => t.completada);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  function fmtDateTime(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );

  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Tareas pendientes
      </p>

      {!readOnly && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Nueva tarea..."
            className="flex-1 text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#2E1A47]"
          />
          {assignees.length > 1 && (
            <select
              value={asignadoNombre}
              onChange={(e) => setAsignadoNombre(e.target.value)}
              className="text-xs border border-gray-200 px-2 py-2 bg-white focus:outline-none focus:border-[#2E1A47] max-w-[140px]"
            >
              {assignees.map((a) => (
                <option key={a.id} value={a.nombre}>{a.nombre}</option>
              ))}
            </select>
          )}
          <button
            onClick={addTask}
            disabled={adding || !titulo.trim()}
            className="bg-[#2E1A47] text-white text-xs font-bold px-4 py-2 hover:bg-[#3d2460] disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Sin tareas</p>
      )}
      <div className="space-y-0.5">
        {pending.map((t) => (
          <div key={t.id}>
            <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 group">
              {!readOnly ? (
                <button
                  onClick={() => toggleTask(t.id, true)}
                  className="w-4 h-4 border-2 border-gray-300 flex-shrink-0 hover:border-[#2E1A47] transition-colors"
                />
              ) : (
                <div className="w-4 h-4 border-2 border-gray-300 flex-shrink-0" />
              )}
              <span className="flex-1 text-sm text-gray-800">{t.titulo}</span>
              {t.asignado_a_nombre && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EEEBF3] text-[#2E1A47]">
                  {t.asignado_a_nombre.split(" ")[0]}
                </span>
              )}
              {t.fecha_programada && (
                <span className="text-[10px] px-1.5 py-0.5 font-semibold bg-amber-50 text-amber-600 flex items-center gap-1">
                  <ClockIcon /> {fmtDateTime(t.fecha_programada)}
                </span>
              )}
              {!readOnly && (
                <button
                  onClick={() => { setSchedulingTaskId(schedulingTaskId === t.id ? null : t.id); setScheduleDate(""); }}
                  title="Programar fecha"
                  className={`p-1 transition-colors ${schedulingTaskId === t.id ? "text-[#2E1A47]" : "text-gray-400 hover:text-[#2E1A47]"}`}
                >
                  <ClockIcon />
                </button>
              )}
              <span className="text-[10px] text-gray-400">{fmtDate(t.created_at)}</span>
              {!readOnly && (
                <button
                  onClick={() => deleteTask(t.id)}
                  className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
            {schedulingTaskId === t.id && !readOnly && (
              <div className="flex items-center gap-2 ml-9 pb-2">
                <span className="text-xs text-gray-500">Fecha:</span>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="text-xs border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-[#2E1A47]"
                />
                <button
                  onClick={() => scheduleReminder(t.id)}
                  disabled={!scheduleDate || scheduling}
                  className="text-xs font-bold px-3 py-1.5 bg-[#2E1A47] text-white hover:bg-[#3d2460] disabled:opacity-40 transition-colors"
                >
                  Programar
                </button>
                <button
                  onClick={() => { setSchedulingTaskId(null); setScheduleDate(""); }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            {done.length} completada{done.length !== 1 ? "s" : ""}
          </summary>
          <div className="space-y-1 mt-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 group">
                {!readOnly ? (
                  <button
                    onClick={() => toggleTask(t.id, false)}
                    className="w-4 h-4 bg-[#2E1A47] flex-shrink-0"
                  >
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-white">
                      <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </button>
                ) : (
                  <div className="w-4 h-4 bg-[#2E1A47] flex-shrink-0">
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-white">
                      <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                )}
                <span className="flex-1 text-sm text-gray-400 line-through">{t.titulo}</span>
                {t.asignado_a_nombre && (
                  <span className="text-[10px] font-bold px-2 py-0.5 opacity-50 bg-[#EEEBF3] text-[#2E1A47]">
                    {t.asignado_a_nombre.split(" ")[0]}
                  </span>
                )}
                {t.completed_at && (
                  <span className="text-[10px] text-gray-300">
                    {daysBetween(t.created_at, t.completed_at)}d
                  </span>
                )}
                {!readOnly && (
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
