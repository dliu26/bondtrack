'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function PastBondsSection({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-semibold text-lg transition-colors w-full text-left py-2"
      >
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        Past Bonds ({count})
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
