'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { updateDefendant } from '../actions'
import type { Defendant } from '@/types/database'

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg text-gray-900">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
      />
    </div>
  )
}

const FREQUENCY_LABELS = { daily: 'Daily', weekly: 'Weekly', custom: 'Custom' }

export default function DefendantInfoCard({ defendant }: { defendant: Defendant }) {
  const [editing, setEditing] = useState(false)
  const [saving, startSave] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: defendant.first_name,
    lastName: defendant.last_name,
    dob: defendant.dob ?? '',
    phone: defendant.phone ?? '',
    address: defendant.address ?? '',
    checkinFrequency: defendant.checkin_frequency,
  })

  function handleCancel() {
    setForm({
      firstName: defendant.first_name,
      lastName: defendant.last_name,
      dob: defendant.dob ?? '',
      phone: defendant.phone ?? '',
      address: defendant.address ?? '',
      checkinFrequency: defendant.checkin_frequency,
    })
    setError(null)
    setEditing(false)
  }

  function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    setError(null)
    startSave(async () => {
      const result = await updateDefendant(defendant.id, form)
      if (result?.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Defendant Info</h2>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="First Name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="John" />
          <InputField label="Last Name *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Smith" />
          <InputField label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
          <InputField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(214) 555-0100" />
          <div className="sm:col-span-2">
            <InputField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, Dallas TX 75201" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Check-in Frequency</label>
            <select
              value={form.checkinFrequency}
              onChange={(e) => setForm({ ...form, checkinFrequency: e.target.value as typeof form.checkinFrequency })}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0f1e3c] text-white px-5 py-2.5 rounded-xl font-medium text-base hover:bg-[#1a2f5a] transition-colors disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl font-medium text-base border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {defendant.first_name} {defendant.last_name}
          </h1>
          <p className="text-gray-500 mt-1">
            Check-in frequency: <span className="font-medium text-gray-700">{FREQUENCY_LABELS[defendant.checkin_frequency]}</span>
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300',
            'text-gray-700 hover:bg-gray-50 transition-colors'
          )}
        >
          <Pencil className="w-4 h-4" />
          Edit Info
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Date of Birth" value={defendant.dob} />
        <Field label="Phone" value={defendant.phone} />
        <Field label="Address" value={defendant.address} />
      </div>
    </div>
  )
}
