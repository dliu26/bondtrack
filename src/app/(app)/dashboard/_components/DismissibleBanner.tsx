'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const STORAGE_KEY = 'bondtrack_disclaimer_dismissed'

export default function DismissibleBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-amber-900 leading-snug">
        <span className="font-semibold">Supplementary tool only.</span>{' '}
        Always verify court dates and deadlines independently through official court sources.
        BondTrack is not liable for missed dates or financial losses resulting from system errors.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-800 transition-colors shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
