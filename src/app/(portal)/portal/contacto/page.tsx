import Image from "next/image";
import Link from "next/link";

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
    icon: "◈",
  },
  {
    label: "Productos financieros",
    desc: "Catálogo completo de soluciones de financiación.",
    href: "/docs/BeGreat_Productos_Financieros.pdf",
    icon: "◉",
  },
];

export default function ContactoPage() {
  return (
    <div className="grid grid-cols-2 gap-8 items-start">

      {/* ── LEFT: Team ────────────────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacto</h1>
          <p className="text-sm text-gray-400 mt-1">Estamos aquí para ayudarte con tus operaciones</p>
        </div>

        {/* Office hero */}
        <div className="bg-[#2E1A47] p-6 text-white mb-5">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Oficina principal</p>
          <p className="text-lg font-bold">BeGreat Consulting</p>
          <p className="text-white/50 text-sm mt-0.5 mb-4">Serrano 118, Madrid</p>
          <a
            href="https://begreatconsulting.es"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-3 py-1.5"
          >
            begreatconsulting.es ↗
          </a>
        </div>

        {/* Team cards — photo appears only here */}
        <div className="space-y-4">
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
      </div>

      {/* ── RIGHT: Downloads + Meeting ────────────────────────────── */}
      <div className="space-y-5 pt-16">

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
                className="flex items-center gap-4 p-4 border border-gray-200 hover:border-[#2E1A47] hover:bg-[#EEEBF3]/30 transition-all group"
              >
                <div className="w-10 h-10 bg-[#2E1A47] flex items-center justify-center flex-shrink-0 text-white text-lg group-hover:bg-[#5a3d80] transition-colors">
                  {doc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
                </div>
                <span className="text-[#2E1A47] text-sm font-bold flex-shrink-0 group-hover:translate-y-0.5 transition-transform">↓</span>
              </a>
            ))}
          </div>
        </div>

        {/* Book a meeting */}
        <div className="bg-[#2E1A47] p-6 text-white">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Reuniones</p>
          <p className="text-lg font-bold mb-1">Reserva una llamada</p>
          <p className="text-white/60 text-sm mb-5">
            Agenda una reunión con el equipo BeGreat directamente en nuestro calendario. Sin esperas.
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
  );
}
