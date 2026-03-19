'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Search, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const STATUS_CONFIG = {
  exonerated: { label: 'Exonerated', color: 'bg-blue-100 text-blue-700' },
  forfeited:  { label: 'Forfeited',  color: 'bg-red-100 text-red-700'  },
  closed:     { label: 'Closed',     color: 'bg-gray-100 text-gray-600' },
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by defendant name…"
          className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          {query ? (
            <>
              <p className="text-xl font-semibold text-gray-500">No bonds match that name.</p>
              <p className="text-gray-400 mt-2">Try a different spelling or clear the search.</p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-gray-500">No closed bonds yet.</p>
              <p className="text-gray-400 mt-2">Bonds you mark as exonerated, forfeited, or closed will appear here.</p>
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
                <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-gray-300 p-5 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-700">
                        {bond.defendant.first_name} {bond.defendant.last_name}
                      </h2>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {bond.charge ?? 'No charge listed'}
                        {bond.county ? ` · ${bond.county} County` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-base font-bold text-gray-500">{currency(bond.bond_amount)}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-3">
                      {bond.case_number && <span>Case #{bond.case_number}</span>}
                      <span>Added {format(parseISO(bond.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <span className="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
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
        <p className="text-sm text-gray-400 text-center mt-4">
          {filtered.length} of {bonds.length} bonds
        </p>
      )}
    </div>
  )
}
