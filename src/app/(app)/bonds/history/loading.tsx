export default function HistoryLoading() {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-6xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-12 w-full bg-white rounded-xl border border-gray-200 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-28" />
        ))}
      </div>
    </div>
  )
}
