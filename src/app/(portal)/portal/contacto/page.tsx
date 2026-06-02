import Image from "next/image";

const equipo = [
  {
    nombre: "Rita Escudero",
    email: "rita.escudero@begreatconsulting.es",
    telefono: "661 367 615",
    rol: "General Manager",
    foto: "/team/rita.png",
  },
  {
    nombre: "Alejandro del Río",
    email: "alejandro.rio@begreatconsulting.es",
    telefono: "602 033 249",
    rol: "Operations Analyst",
    foto: "/team/alejandro.png",
  },
];

const docs = [
  {
    label: "Presentación corporativa",
    desc: "Quiénes somos, qué hacemos y cómo trabajamos.",
    href: "/docs/BeGreat_Presentacion_Corporativa.pdf",
  },
  {
    label: "Productos financieros",
    desc: "Catálogo de soluciones de financiación.",
    href: "/docs/BeGreat_Productos_Financieros.pdf",
  },
];

export default function ContactoPage() {
  return (
    <div className="space-y-6">

      {/* ── Brand hero ─────────────────────────────────────────────── */}
      <div className="bg-[#2E1A47] px-10 py-8 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-2">BeGreat Consulting</p>
          <h1 className="text-xl font-black text-white uppercase tracking-wide leading-snug">
            Transformamos tus desafíos<br />en éxitos empresariales
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.linkedin.com/company/begreat-consulting"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-4 py-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
          <a
            href="https://begreatconsulting.es"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-4 py-2"
          >
            begreatconsulting.es ↗
          </a>
        </div>
      </div>

      {/* ── Equipo + Documentación ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Equipo */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Equipo</p>
          <div className="space-y-3">
            {equipo.map((p) => (
              <div key={p.nombre} className="bg-white border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-14 h-14 flex-shrink-0 overflow-hidden bg-[#EEEBF3]">
                  <Image src={p.foto} alt={p.nombre} width={56} height={56} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.nombre}</p>
                  <p className="text-xs text-[#2E1A47] font-bold uppercase tracking-wider mt-0.5">{p.rol}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    <a
                      href={`tel:+34${p.telefono.replace(/\s/g, "")}`}
                      className="text-xs text-gray-500 hover:text-[#2E1A47] transition-colors font-mono"
                    >
                      {p.telefono}
                    </a>
                    <a
                      href={`mailto:${p.email}`}
                      className="text-xs text-gray-400 hover:text-[#2E1A47] transition-colors truncate"
                    >
                      {p.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentación */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Documentación</p>
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-4">
              Descarga nuestras presentaciones para compartir con tus clientes.
            </p>
            <div className="space-y-3">
              {docs.map((doc) => (
                <a
                  key={doc.label}
                  href={doc.href}
                  download
                  className="flex items-center gap-3 p-3 border border-gray-200 hover:border-[#2E1A47] hover:bg-[#EEEBF3]/30 transition-all group"
                >
                  <div className="w-8 h-8 bg-[#2E1A47] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 group-hover:bg-[#5a3d80] transition-colors">
                    PDF
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.desc}</p>
                  </div>
                  <span className="text-[#2E1A47] font-bold text-sm flex-shrink-0">↓</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Agenda + Oficina ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Reservar reunión */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Agenda una llamada</p>
          <div className="bg-[#2E1A47] p-6 text-white flex flex-col justify-between" style={{ minHeight: 160 }}>
            <div>
              <p className="text-lg font-bold mb-2">Reserva una reunión</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Accede a nuestro calendario y elige el horario que mejor te venga. Sin esperas, sin llamadas innecesarias.
              </p>
            </div>
            <a
              href="https://calendly.com/begreatconsulting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#2E1A47] px-4 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors mt-5 self-start"
            >
              Reservar en Calendly →
            </a>
          </div>
        </div>

        {/* Oficina */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Dónde estamos</p>
          <div className="bg-white border border-gray-200 p-6 flex flex-col justify-between" style={{ minHeight: 160 }}>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Oficina principal</p>
              <p className="text-xl font-bold text-gray-900">Serrano 118</p>
              <p className="text-sm text-gray-500 mt-0.5">Madrid, España</p>
            </div>
            <div className="mt-5">
              <a
                href="https://maps.google.com/?q=Serrano+118+Madrid"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#2E1A47] text-[#2E1A47] px-4 py-2 text-sm font-semibold hover:bg-[#2E1A47] hover:text-white transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
