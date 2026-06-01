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
    desc: "Catálogo completo de soluciones de financiación.",
    href: "/docs/BeGreat_Productos_Financieros.pdf",
  },
];

export default function ContactoPage() {
  return (
    <div>

      {/* ── Brand hero ────────────────────────────────────────────── */}
      <div className="bg-[#2E1A47] px-10 py-8 mb-8 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-3">BeGreat Consulting</p>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider leading-tight">
            Transformamos tus desafíos<br />en éxitos empresariales
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <a
            href="https://www.linkedin.com/company/begreat-consulting"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-4 py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
          <a
            href="https://begreatconsulting.es"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-4 py-2"
          >
            begreatconsulting.es ↗
          </a>
        </div>
      </div>

      {/* ── Two columns ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-8 items-start">

        {/* LEFT: Team — photos appear only here */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Equipo</p>
          {equipo.map((p) => (
            <div key={p.nombre} className="bg-white border border-gray-200 p-5 flex items-center gap-5">
              <div className="w-16 h-16 flex-shrink-0 overflow-hidden bg-[#EEEBF3]">
                <Image src={p.foto} alt={p.nombre} width={64} height={64} className="object-cover w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{p.nombre}</p>
                <p className="text-xs text-[#2E1A47] font-bold uppercase tracking-wider mt-0.5">{p.rol}</p>
                <a href={`mailto:${p.email}`} className="text-xs text-gray-400 hover:text-[#2E1A47] transition-colors mt-1.5 block truncate">
                  {p.email}
                </a>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <a
                  href={`tel:+34${p.telefono.replace(/\s/g, "")}`}
                  className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#5a3d80] transition-colors text-center whitespace-nowrap"
                >
                  {p.telefono}
                </a>
                <a
                  href={`mailto:${p.email}`}
                  className="bg-[#EEEBF3] text-[#2E1A47] px-4 py-2 text-sm font-semibold hover:bg-[#2E1A47] hover:text-white transition-colors text-center"
                >
                  Email
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Downloads + Meeting */}
        <div className="space-y-5">

          {/* Downloads */}
          <div className="bg-white border border-gray-200 p-6">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-1">Documentación</p>
            <p className="text-xs text-gray-400 mb-5">Descarga nuestras presentaciones para compartir con tus clientes.</p>
            <div className="space-y-3">
              {docs.map((doc) => (
                <a
                  key={doc.label}
                  href={doc.href}
                  download
                  className="flex items-center gap-4 p-4 border border-gray-200 hover:border-[#2E1A47] hover:bg-[#EEEBF3]/40 transition-all group"
                >
                  <div className="w-9 h-9 bg-[#2E1A47] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold group-hover:bg-[#5a3d80] transition-colors">
                    PDF
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
                  </div>
                  <span className="text-[#2E1A47] text-sm font-bold flex-shrink-0">↓</span>
                </a>
              ))}
            </div>
          </div>

          {/* Book meeting */}
          <div className="bg-[#2E1A47] p-6 text-white">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Agenda</p>
            <p className="text-lg font-bold mb-1">Reserva una llamada con nosotros</p>
            <p className="text-white/60 text-sm mb-5">
              Accede a nuestro calendario y elige el horario que mejor te venga. Sin esperas.
            </p>
            <a
              href="https://calendly.com/begreatconsulting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#2E1A47] px-5 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Reservar reunión →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
