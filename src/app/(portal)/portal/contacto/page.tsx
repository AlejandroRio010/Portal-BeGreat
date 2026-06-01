export default function ContactoPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Contacto</h1>
        <p className="text-sm text-gray-500 mt-1">Datos de contacto de BeGreat Consulting</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Web</p>
          <a href="https://begreatconsulting.es" target="_blank" className="text-sm text-[#2E1A47] font-medium hover:underline">
            begreatconsulting.es
          </a>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Dirección</p>
          <p className="text-sm text-gray-900 font-medium">Serrano 118, Madrid</p>
        </div>
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Equipo</p>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Rita Escudero</p>
              <a href="mailto:rita.escudero@begreatconsulting.es" className="text-sm text-[#2E1A47] hover:underline">
                rita.escudero@begreatconsulting.es
              </a>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Alejandro del Río</p>
              <a href="mailto:alejandro.rio@begreatconsulting.es" className="text-sm text-[#2E1A47] hover:underline">
                alejandro.rio@begreatconsulting.es
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
