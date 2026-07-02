export function Stub({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{title}</h1>
      <div className="mt-4 bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-300">construction</span>
        <p className="text-sm text-gray-500 mt-2">{note}</p>
      </div>
    </div>
  )
}
