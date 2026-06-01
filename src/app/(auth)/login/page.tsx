"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o contraseña incorrectos.");
    } else {
      // Forzamos navegación completa para que el proxy lea la sesión correctamente
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2E1A47]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BEGREAT <span className="font-light text-white/70">CONSULTING</span>
          </h1>
          <p className="text-white/50 text-sm mt-2">Portal de colaboradores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Accede a tu portal</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E1A47] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5a3d80] transition-colors disabled:opacity-60"
            >
              {loading ? "Accediendo..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Problemas para acceder? Contacta con BeGreat.
          </p>
        </div>
      </div>
    </div>
  );
}
