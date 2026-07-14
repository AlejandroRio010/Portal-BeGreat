"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-10 overflow-hidden bg-[#2E1A47]">
      <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-60" priority />
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(46,26,71,0.82) 0%, rgba(46,26,71,0.55) 45%, rgba(46,26,71,0.88) 100%)" }} />

      <div className="relative z-10 w-full max-w-md" style={{ zoom: 0.95 }}>
        <div className="flex justify-center mb-7">
          <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={190} height={56} className="object-contain" priority />
        </div>

        {sent ? (
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold mb-3">Revisa tu correo</h1>
            <p className="text-white/65 text-sm leading-relaxed">
              Si el email pertenece a una cuenta del portal, te hemos enviado un enlace para restablecer tu contraseña.
              Caduca en 1 hora.
            </p>
            <Link href="/login" className="inline-block mt-8 text-white font-semibold text-sm hover:underline">← Volver al inicio de sesión</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-white text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
              <p className="text-white/65 text-sm mt-3 leading-relaxed">
                Introduce tu email y te enviaremos un enlace para crear una nueva.
              </p>
            </div>

            <form onSubmit={handleSubmit}
              className="space-y-5 rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.14] p-7 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.5)]">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/25 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/70 focus:bg-white/[0.10] transition-colors"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFC845] text-[#2E1A47] py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-[#ffd469] shadow-[0_8px_24px_-8px_rgb(255_200_69/0.45)] transition-colors disabled:opacity-60"
              >
                {loading ? "Enviando…" : "Enviar enlace de recuperación"}
              </button>
            </form>

            <p className="text-center text-xs text-white/45 mt-7">
              <Link href="/login" className="text-white font-semibold hover:underline">← Volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
