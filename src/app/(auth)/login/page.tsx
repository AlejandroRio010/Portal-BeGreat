"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos.");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-10 overflow-hidden bg-[#2E1A47]">
      {/* Fondo a pantalla completa */}
      <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-60" priority />
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(46,26,71,0.82) 0%, rgba(46,26,71,0.55) 45%, rgba(46,26,71,0.88) 100%)" }} />

      {/* Contenido — zoom para que entre todo sin scroll */}
      <div className="relative z-10 w-full max-w-md" style={{ zoom: 0.92 }}>
        {/* Logo */}
        <div className="flex justify-center mb-7">
          <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={190} height={56} className="object-contain" priority />
        </div>

        {/* Texto superior */}
        <div className="text-center mb-8">
          <h1 className="text-white text-3xl font-bold leading-tight">Bienvenido al portal de BeGreat</h1>
          <p className="text-white/65 text-sm mt-4 leading-relaxed">
            Gestiona tus operaciones y haz seguimiento desde un mismo lugar.
          </p>
          <p className="text-white/45 text-xs uppercase tracking-[0.15em] mt-2">
            Consultoría financiera y renting de equipos
          </p>
        </div>

        {/* Credenciales — sin tarjeta, sobre la imagen */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-3.5 py-3 bg-transparent border border-white/30 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-3 bg-transparent border border-white/30 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-100 bg-red-500/20 border border-red-400/40 px-3.5 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/15 backdrop-blur-sm border border-white/25 text-white py-3 text-sm font-bold tracking-wide hover:bg-white/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? "Accediendo…" : "Entrar al portal"}
            {!loading && <span className="text-white/70">→</span>}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-xs text-white/55 hover:text-white hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-white/45 mt-7">
          ¿Problemas para acceder?{" "}
          <a href="mailto:alejandro.rio@begreatconsulting.es" className="text-white font-semibold hover:underline">Contacta con BeGreat</a>
        </p>

        <p className="text-center text-white/25 text-xs mt-6">© {new Date().getFullYear()} BeGreat Consulting · Acceso reservado</p>
      </div>
    </div>
  );
}
