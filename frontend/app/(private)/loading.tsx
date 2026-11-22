// Shown at once when a page of the private area is opened, while the server prepares its data.
// Without it, tapping a tab of the bottom bar changes nothing on screen until the backend has
// answered (Resumen, Transacciones and Categorías fetch on the server), and it feels frozen.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-4 px-3 py-4 sm:px-4">
      <span className="sr-only">Cargando…</span>
      <div className="h-6 w-40 rounded bg-layer-2" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded bg-layer-2" />
        ))}
      </div>
      <div className="h-64 rounded bg-layer-2" />
    </div>
  )
}
