export default function DashboardLoading() {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-6xl animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-8">
        <div>
          <div className="h-8 w-36 bg-gray-200 rounded-lg mb-2" />
          <div className="h-5 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-11 w-28 bg-gray-200 rounded-xl" />
      </div>
      {/* Briefing card */}
      <div className="bg-white rounded-2xl border border-gray-200 h-28 mb-6" />
      {/* Bond cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 h-48" />
        ))}
      </div>
    </div>
  )
}
