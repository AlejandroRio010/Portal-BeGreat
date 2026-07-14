"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "No se pudo cambiar la contraseña.");
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-3">Enlace no válido</h1>
        <p className="text-white/65 text-sm">Falta el código de recuperación. Solicita un nuevo enlace.</p>
        <Link href="/forgot-password" className="inline-block mt-8 text-white font-semibold text-sm hover:underline">Solicitar enlace</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-3">¡Contraseña actualizada!</h1>
        <p className="text-white/65 text-sm">Ya puedes acceder al portal con tu nueva contraseña.</p>
        <Link href="/login" className="inline-block mt-8 bg-gradient-to-b from-[#FFE14D] to-[#FFC800] text-[#2E1A47] px-6 py-3 rounded-xl text-sm font-bold hover:from-[#FFE97A] hover:to-[#FFD21A] shadow-[0_10px_28px_-8px_rgb(255_210_0/0.55)] transition-colors">Ir al inicio de sesión →</Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-white text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-white/65 text-sm mt-3">Crea una contraseña nueva para tu acceso.</p>
      </div>

      <form onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.14] p-7 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.5)]">
        <div>
          <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/25 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/70 focus:bg-white/[0.10] transition-colors"
            placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Repetir contraseña</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/25 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/70 focus:bg-white/[0.10] transition-colors"
            placeholder="••••••••" />
        </div>

        {error && <p className="text-sm text-red-100 bg-red-500/20 border border-red-400/40 rounded-xl px-3.5 py-2.5">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-b from-[#FFE14D] to-[#FFC800] text-[#2E1A47] py-3 rounded-xl text-sm font-bold tracking-wide hover:from-[#FFE97A] hover:to-[#FFD21A] shadow-[0_10px_28px_-8px_rgb(255_210_0/0.55)] transition-colors disabled:opacity-60">
          {loading ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-10 overflow-hidden bg-[#2E1A47]">
      <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-60" priority />
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(46,26,71,0.82) 0%, rgba(46,26,71,0.55) 45%, rgba(46,26,71,0.88) 100%)" }} />
      <div className="relative z-10 w-full max-w-md" style={{ zoom: 0.95 }}>
        <div className="flex justify-center mb-7">
          <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={190} height={56} className="object-contain" priority />
        </div>
        <Suspense fallback={<p className="text-center text-white/50 text-sm">Cargando…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
