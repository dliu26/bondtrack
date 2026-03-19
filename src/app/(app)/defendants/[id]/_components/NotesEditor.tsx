'use client'

import { useState, useRef, useTransition } from 'react'
import { updateNotes } from '../actions'

export default function NotesEditor({
  defendantId,
  initialNotes,
}: {
  defendantId: string
  initialNotes: string | null
}) {
  const [value, setValue] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const [saving, startSave] = useTransition()
  const lastSaved = useRef(initialNotes ?? '')

  function handleBlur() {
    if (value === lastSaved.current) return
    startSave(async () => {
      const result = await updateNotes(defendantId, value)
      if (!result?.error) {
        lastSaved.current = value
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <span className="text-sm text-gray-400 h-5">
          {saving ? 'Saving…' : saved ? '✓ Saved' : ''}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={4}
        placeholder="Add notes about this defendant — court updates, contact history, special instructions…"
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] text-gray-800 placeholder-gray-400"
      />
      <p className="text-xs text-gray-400 mt-1.5">Auto-saves when you click away.</p>
    </div>
  )
}
