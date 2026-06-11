"use client";

import { useState, useEffect } from "react";

type User = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  created_at: string;
};

export default function UsuariosPanel({ colaboradorId, colaboradorActivo }: { colaboradorId: string; colaboradorActivo: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Access link state (per user)
  const [linkUserId, setLinkUserId] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/colaboradores/${colaboradorId}/users`)
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [colaboradorId]);

  async function addUser() {
    if (!nombre.trim() || !email.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), email: email.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear usuario");
      setSaving(false);
      return;
    }
    const user = await res.json();
    setUsers((prev) => [...prev, user]);
    setNombre("");
    setEmail("");
    setShowForm(false);
    setSaving(false);
  }

  async function toggleActivo(userId: string, activo: boolean) {
    await fetch(`/api/admin/colaboradores/${colaboradorId}/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, activo }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, activo } : u)));
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Eliminar este usuario? Se perderá su acceso.")) return;
    await fetch(`/api/admin/colaboradores/${colaboradorId}/users`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function generarEnlace(userId: string, tipo: "invitacion" | "reset", enviarEmail = false) {
    setLinkUserId(userId);
    setGenerando(true);
    setLink(null);
    setCopiado(false);
    setEmailEnviado(false);
    const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/access-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, enviarEmail, userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLink(data.url);
      if (data.emailSent) setEmailEnviado(true);
    }
    setGenerando(false);
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Usuarios de acceso</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold text-[#2E1A47] hover:underline"
        >
          {showForm ? "Cancelar" : "+ Añadir usuario"}
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading && <p className="text-xs text-gray-400">Cargando...</p>}

        {!loading && users.length === 0 && !showForm && (
          <p className="text-xs text-gray-400">No hay usuarios. Añade uno para dar acceso al portal.</p>
        )}

        {showForm && (
          <div className="border border-gray-100 p-3 space-y-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del usuario"
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#2E1A47]"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email de acceso"
              type="email"
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#2E1A47]"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={addUser}
              disabled={saving || !nombre.trim() || !email.trim()}
              className="w-full py-2 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        )}

        {users.map((u) => (
          <div key={u.id} className="border border-gray-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">{u.nombre}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-semibold border ${
                    u.activo
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-400 border-gray-200"
                  }`}
                >
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => generarEnlace(u.id, "invitacion", true)}
                disabled={generando || !colaboradorActivo || !u.activo}
                className="py-1.5 px-3 bg-[#2E1A47] text-white text-[11px] font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
              >
                Enviar invitación
              </button>
              <button
                onClick={() => generarEnlace(u.id, "reset", true)}
                disabled={generando || !colaboradorActivo || !u.activo}
                className="py-1.5 px-3 border border-[#2E1A47] text-[#2E1A47] text-[11px] font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50"
              >
                Reset contraseña
              </button>
              <button
                onClick={() => generarEnlace(u.id, "invitacion", false)}
                disabled={generando || !colaboradorActivo || !u.activo}
                className="py-1.5 px-3 border border-gray-200 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Solo enlace
              </button>
              <button
                onClick={() => toggleActivo(u.id, !u.activo)}
                className="py-1.5 px-3 border border-gray-200 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {u.activo ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => deleteUser(u.id)}
                className="py-1.5 px-3 border border-red-200 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                Eliminar
              </button>
            </div>

            {linkUserId === u.id && emailEnviado && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 font-semibold">
                Email enviado a {u.email}
              </p>
            )}

            {linkUserId === u.id && link && (
              <div className="border border-gray-200 bg-gray-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Enlace — válido 48 horas</p>
                <div className="flex gap-2 items-center">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={copiar}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      copiado ? "bg-emerald-600 text-white" : "bg-[#2E1A47] text-white hover:bg-[#3d2460]"
                    }`}
                  >
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
