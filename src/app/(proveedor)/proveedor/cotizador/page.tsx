import CotizadorRenting from "@/components/CotizadorRenting";

export default function ProveedorCotizadorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cotizador renting</h1>
        <p className="text-sm text-gray-400 mt-1">Estimación de cuotas mensuales por entidad financiera</p>
      </div>
      <CotizadorRenting />
    </div>
  );
}
