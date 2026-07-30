// Esqueleto de carga compartido: se muestra al instante al navegar mientras
// el servidor prepara la página (percepción de velocidad).
export default function PageLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-40 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-72 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-56 bg-gray-100 rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="h-64 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
      <div className="h-40 bg-gray-100 rounded-2xl" />
    </div>
  );
}
