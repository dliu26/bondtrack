export default function NotificationsLoading() {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl animate-pulse">
      <div className="h-8 w-44 bg-gray-200 rounded-lg mb-8" />
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-4 px-6 py-5">
            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-5 w-full bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
