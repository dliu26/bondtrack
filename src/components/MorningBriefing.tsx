'use client'

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

interface PortfolioSummary {
  totalActive: number
  redCount: number
  yellowCount: number
  greenCount: number
}

interface MorningBriefingProps {
  portfolioSummary: PortfolioSummary
}

export default function MorningBriefing({ portfolioSummary }: MorningBriefingProps) {
  const [bullets, setBullets] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function fetchBriefing() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioSummary }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setBullets(data.bullets ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-[#0f1e3c] rounded-xl p-6 text-white mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-300" />
          <h2 className="text-lg font-semibold">Morning Briefing</h2>
          <span className="text-white/40 text-sm">— AI summary of today&apos;s portfolio</span>
        </div>
        {!loading && (
          <button
            onClick={fetchBriefing}
            className="text-white/50 hover:text-white transition-colors p-1 rounded"
            title="Refresh briefing"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-white/60 text-base">
          Unable to load briefing.{' '}
          <button onClick={fetchBriefing} className="underline text-white/80 hover:text-white">
            Try again
          </button>
        </p>
      )}

      {!loading && !error && bullets.length > 0 && (
        <ul className="space-y-3">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
              <span className="text-white/90 text-base leading-snug">{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && bullets.length === 0 && (
        <p className="text-white/60 text-base">No active bonds in your portfolio yet.</p>
      )}
    </div>
  )
}
