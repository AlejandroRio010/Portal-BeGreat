"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* ── Panel izquierdo (marca) ── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#2E1A47] px-12 py-12">
        {/* Imagen de fondo */}
        <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-30" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(46,26,71,0.92) 0%, rgba(46,26,71,0.75) 55%, rgba(46,26,71,0.95) 100%)" }} />
        {/* Marca de agua logo */}
        <div className="absolute -bottom-16 -right-10 opacity-[0.06] pointer-events-none">
          <Image src="/begreat-logo-blanco.png" alt="" width={520} height={160} className="object-contain" />
        </div>

        {/* Logo arriba */}
        <div className="relative z-10">
          <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={170} height={50} className="object-contain" priority />
        </div>

        {/* Mensaje */}
        <div className="relative z-10 max-w-md">
          <p className="text-white/45 text-xs uppercase tracking-[0.25em] mb-4">Portal privado</p>
          <h2 className="text-white text-3xl font-bold leading-tight">
            Bienvenido al portal de<br />colaboradores de BeGreat
          </h2>
          <p className="text-white/55 text-sm mt-4 leading-relaxed">
            Gestiona tus operaciones, clientes y comisiones en un único lugar. Consultoría financiera y renting de equipos.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} BeGreat Consulting · Acceso reservado</p>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex items-center justify-center px-6 py-12 bg-[#f8f7fb]">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#2E1A47] px-6 py-4">
              <Image src="/begreat-logo-blanco.png" alt="BeGreat Consulting" width={150} height={44} className="object-contain" priority />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
            <p className="text-sm text-gray-400 mt-1.5">Introduce tus credenciales para acceder a tu portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3.5 py-3 border border-gray-300 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-3 border border-gray-300 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3.5 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E1A47] text-white py-3 text-sm font-bold tracking-wide hover:bg-[#3d2460] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Accediendo…" : "Entrar al portal"}
              {!loading && <span className="text-white/70">→</span>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-400">
              ¿Problemas para acceder?{" "}
              <a href="mailto:hola@begreatconsulting.es" className="text-[#2E1A47] font-semibold hover:underline">Contacta con BeGreat</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
