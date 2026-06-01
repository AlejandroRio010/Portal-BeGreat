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

export default function ContactoPage() {
  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Contacto</h1>
        <p className="text-sm text-gray-400 mt-1">Estamos aquí para ayudarte con tus operaciones</p>
      </div>

      {/* Hero card */}
      <div className="bg-[#2E1A47] p-7 text-white mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Oficina principal</p>
            <h2 className="text-xl font-bold">BeGreat Consulting</h2>
            <p className="text-white/60 text-sm mt-1">Serrano 118, Madrid</p>
          </div>
          <a
            href="https://begreatconsulting.es"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-3 py-1.5"
          >
            begreatconsulting.es ↗
          </a>
        </div>

        <div className="flex gap-4">
          {equipo.map((p) => (
            <a
              key={p.nombre}
              href={`tel:+34${p.telefono.replace(/\s/g, "")}`}
              className="flex-1 bg-white/10 hover:bg-white/20 transition-colors p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 flex-shrink-0 overflow-hidden bg-white/20">
                <Image src={p.foto} alt={p.nombre} width={40} height={40} className="object-cover w-full h-full" />
              </div>
              <div>
                <p className="text-sm font-semibold">{p.nombre.split(" ")[0]}</p>
                <p className="text-white/70 text-sm font-mono">{p.telefono}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Team cards */}
      <div className="space-y-4">
        {equipo.map((p) => (
          <div key={p.nombre} className="bg-white border border-gray-200 p-5 flex items-center gap-5">
            <div className="w-16 h-16 flex-shrink-0 overflow-hidden bg-[#EEEBF3]">
              <Image src={p.foto} alt={p.nombre} width={64} height={64} className="object-cover w-full h-full" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{p.nombre}</p>
              <p className="text-xs text-[#2E1A47] font-semibold uppercase tracking-wider mt-0.5">{p.rol}</p>
              <div className="flex items-center gap-4 mt-2">
                <a href={`mailto:${p.email}`} className="text-xs text-gray-500 hover:text-[#2E1A47] transition-colors">
                  {p.email}
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={`tel:+34${p.telefono.replace(/\s/g, "")}`}
                className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#5a3d80] transition-colors text-center"
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
  );
}
