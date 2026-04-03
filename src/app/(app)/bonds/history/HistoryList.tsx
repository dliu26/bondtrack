'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronRight } from 'lucide-react'
import { formatTimestamp } from '@/lib/date'
import { sanitizeText } from '@/lib/sanitize'
import clsx from 'clsx'

const STATUS_CONFIG = {
  exonerated: { label: 'Exonerated', color: 'bg-blue-900/40 text-blue-300' },
  forfeited:  { label: 'Forfeited',  color: 'bg-red-900/40 text-red-400'   },
  closed:     { label: 'Closed',     color: 'bg-white/10 text-slate-400'   },
}

function currency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export interface ClosedBond {
  id: string
  bond_amount: number
  charge: string | null
  case_number: string | null
  county: string | null
  status: 'exonerated' | 'forfeited' | 'closed'
  created_at: string
  defendant: {
    id: string
    first_name: string
    last_name: string
  }
  last_court_date: string | null
}

export default function HistoryList({ bonds }: { bonds: ClosedBond[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? bonds.filter((b) => {
        const name = `${b.defendant.first_name} ${b.defendant.last_name}`.toLowerCase()
        return name.includes(query.trim().toLowerCase())
      })
    : bonds

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by defendant name…"
          className="w-full pl-10 pr-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#1a2d4f] rounded-2xl border border-white/10">
          {query ? (
            <>
              <p className="text-xl font-semibold text-slate-300">No bonds match that name.</p>
              <p className="text-slate-400 mt-2">Try a different spelling or clear the search.</p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-slate-300">No closed bonds yet.</p>
              <p className="text-slate-400 mt-2">Bonds you mark as exonerated, forfeited, or closed will appear here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((bond) => {
            const cfg = STATUS_CONFIG[bond.status]
            return (
              <Link
                key={bond.id}
                href={`/defendants/${bond.defendant.id}`}
                className="block group"
              >
                <div className="bg-[#1a2d4f] rounded-xl border border-white/10 border-l-4 border-l-white/20 p-5 hover:bg-white/5 hover:shadow-lg transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {bond.defendant.first_name} {bond.defendant.last_name}
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {sanitizeText(bond.charge) || 'No charge listed'}
                        {bond.county ? ` · ${sanitizeText(bond.county)} County` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-base font-bold text-slate-400">{currency(bond.bond_amount)}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-3">
                      {bond.case_number && <span>Case #{sanitizeText(bond.case_number)}</span>}
                      <span>Added {formatTimestamp(bond.created_at)}</span>
                    </div>
                    <span className="flex items-center gap-1 text-slate-500 group-hover:text-white transition-colors">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && query && (
        <p className="text-sm text-slate-400 text-center mt-4">
          {filtered.length} of {bonds.length} bonds
        </p>
      )}
    </div>
  )
}
