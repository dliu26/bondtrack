'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in dev; in production wire up to your error tracker
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-base mb-6">
          An unexpected error occurred. Your data is safe — please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#0f1e3c] text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-semibold text-base border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
