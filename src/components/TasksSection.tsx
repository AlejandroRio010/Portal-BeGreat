"use client";

import { useState } from "react";

type Task = {
  id: string;
  titulo: string;
  asignado_a: string;
  asignado_a_id: string | null;
  asignado_a_nombre: string | null;
  completada: boolean;
  created_at: string;
  completed_at: string | null;
  fecha_programada: string | null;
  recordatorio_enviado: boolean;
};

type Assignee = { id: string; nombre: string };

export default function TasksSection({
  initialTasks,
  operationId,
  assignees,
  canSendReminders = false,
}: {
  initialTasks: Task[];
  operationId: string;
  assignees: Assignee[];
  canSendReminders?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [titulo, setTitulo] = useState("");
  const [asignadoId, setAsignadoId] = useState(assignees[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState("");

  async function addTask() {
    if (!titulo.trim() || !asignadoId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/operations/${operationId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, asignado_a_id: asignadoId, asignado_a_nombre: assignees.find(a => a.id === asignadoId)?.nombre, fecha_programada: fechaProgramada || null }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [...prev, task]);
        setTitulo("");
        setFechaProgramada("");
        setShowSchedule(false);
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleTask(taskId: string, completada: boolean) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completada, completed_at: completada ? new Date().toISOString() : null }
          : t
      )
    );
    await fetch(`/api/operations/${operationId}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, completada }),
    });
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`/api/operations/${operationId}/tasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
  }

  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function sendReminder(assigneeId: string) {
    setSendingTo(assigneeId);
    setSentTo(null);
    try {
      const res = await fetch(`/api/operations/${operationId}/tasks/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (res.ok) {
        setSentTo(assigneeId);
        setTimeout(() => setSentTo(null), 3000);
      }
    } finally {
      setSendingTo(null);
    }
  }

  const pending = tasks.filter((t) => !t.completada);
  const done = tasks.filter((t) => t.completada);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }
  function shortName(nombre: string | null, fallbackRole?: string) {
    if (!nombre) return fallbackRole === "colaborador" ? "Colab." : fallbackRole === "admin" ? "Admin" : "?";
    return nombre.split(" ")[0];
  }

  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Tareas pendientes
      </p>

      {/* Add task */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Nueva tarea..."
            className="flex-1 text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#2E1A47]"
          />
          <select
            value={asignadoId}
            onChange={(e) => setAsignadoId(e.target.value)}
            className="text-xs border border-gray-200 px-2 py-2 bg-white focus:outline-none focus:border-[#2E1A47] max-w-[140px]"
          >
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            title={showSchedule ? "Quitar programación" : "Programar recordatorio"}
            className={`text-sm px-2 py-2 border transition-colors ${showSchedule ? "border-[#2E1A47] bg-[#EEEBF3] text-[#2E1A47]" : "border-gray-200 text-gray-400 hover:text-[#2E1A47] hover:border-[#2E1A47]"}`}
          >
            🕐
          </button>
          <button
            onClick={addTask}
            disabled={adding || !titulo.trim()}
            className="bg-[#2E1A47] text-white text-xs font-bold px-4 py-2 hover:bg-[#3d2460] disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
        {showSchedule && (
          <div className="flex items-center gap-2 mt-2 pl-1">
            <span className="text-xs text-gray-500">Recordatorio para:</span>
            <input
              type="date"
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="text-xs border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-[#2E1A47]"
            />
            {fechaProgramada && (
              <button onClick={() => { setFechaProgramada(""); setShowSchedule(false); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>
            )}
          </div>
        )}
      </div>

      {/* Pending */}
      {pending.length === 0 && done.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Sin tareas</p>
      )}
      <div className="space-y-1">
        {pending.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 group">
            <button
              onClick={() => toggleTask(t.id, true)}
              className="w-4 h-4 border-2 border-gray-300 flex-shrink-0 hover:border-[#2E1A47] transition-colors"
            />
            <span className="flex-1 text-sm text-gray-800">{t.titulo}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EEEBF3] text-[#2E1A47]">
              {shortName(t.asignado_a_nombre, t.asignado_a)}
            </span>
            {t.fecha_programada && (
              <span className={`text-[10px] px-1.5 py-0.5 font-semibold ${t.recordatorio_enviado ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                title={t.recordatorio_enviado ? "Recordatorio enviado" : `Programado para ${fmtDate(t.fecha_programada)}`}>
                🕐 {fmtDate(t.fecha_programada)}{t.recordatorio_enviado ? " ✓" : ""}
              </span>
            )}
            {canSendReminders && t.asignado_a_id && (
              <button
                onClick={() => sendReminder(t.asignado_a_id!)}
                disabled={sendingTo === t.asignado_a_id}
                title={sentTo === t.asignado_a_id ? "Enviado" : `Enviar recordatorio a ${t.asignado_a_nombre}`}
                className={`text-lg px-1.5 py-1 rounded transition-colors ${sentTo === t.asignado_a_id ? "text-emerald-500 bg-emerald-50" : "text-gray-400 hover:text-[#2E1A47] hover:bg-[#EEEBF3]"}`}
              >
                {sendingTo === t.asignado_a_id ? "…" : sentTo === t.asignado_a_id ? "✓" : "✉"}
              </button>
            )}
            <span className="text-[10px] text-gray-400">{fmtDate(t.created_at)}</span>
            <button
              onClick={() => deleteTask(t.id)}
              className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            {done.length} completada{done.length !== 1 ? "s" : ""}
          </summary>
          <div className="space-y-1 mt-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 group">
                <button
                  onClick={() => toggleTask(t.id, false)}
                  className="w-4 h-4 bg-[#2E1A47] flex-shrink-0"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-white">
                    <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </button>
                <span className="flex-1 text-sm text-gray-400 line-through">{t.titulo}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 opacity-50 bg-[#EEEBF3] text-[#2E1A47]">
                  {shortName(t.asignado_a_nombre, t.asignado_a)}
                </span>
                {t.completed_at && (
                  <span className="text-[10px] text-gray-300">
                    {daysBetween(t.created_at, t.completed_at)}d
                  </span>
                )}
                <button
                  onClick={() => deleteTask(t.id)}
                  className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
