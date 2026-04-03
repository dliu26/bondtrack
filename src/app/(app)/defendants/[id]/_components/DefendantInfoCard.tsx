'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { updateDefendant } from '../actions'
import { validatePhone, validateDob } from '@/lib/validation'
import { toast } from '@/lib/toast'
import type { Defendant } from '@/types/database'
import PhoneButton from '@/components/PhoneButton'

const inputCls = 'w-full px-3 py-2.5 text-base bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400'

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-0.5">{label}</p>
      <p className="text-lg text-white">{value || <span className="text-slate-500 italic">Not provided</span>}</p>
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
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )
}

const FREQUENCY_LABELS = { daily: 'Daily', weekly: 'Weekly', custom: 'Custom' }

function fmtHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:00 ${ampm} CT`
}

const CHECKIN_HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 6)

export default function DefendantInfoCard({ defendant }: { defendant: Defendant }) {
  const [editing, setEditing] = useState(false)
  const [saving, startSave] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    firstName: defendant.first_name,
    lastName: defendant.last_name,
    dob: defendant.dob ?? '',
    phone: defendant.phone ?? '',
    address: defendant.address ?? '',
    checkinFrequency: defendant.checkin_frequency,
    checkinHourCt: defendant.checkin_hour_ct ?? 8,
  })

  function handleCancel() {
    setForm({
      firstName: defendant.first_name,
      lastName: defendant.last_name,
      dob: defendant.dob ?? '',
      phone: defendant.phone ?? '',
      address: defendant.address ?? '',
      checkinFrequency: defendant.checkin_frequency,
      checkinHourCt: defendant.checkin_hour_ct ?? 8,
    })
    setError(null)
    setFieldErrors({})
    setEditing(false)
  }

  function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    const newFieldErrors: Record<string, string> = {}
    const phoneErr = validatePhone(form.phone)
    if (phoneErr) newFieldErrors.phone = phoneErr
    const dobErr = validateDob(form.dob)
    if (dobErr) newFieldErrors.dob = dobErr
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors)
      return
    }
    setFieldErrors({})
    setError(null)
    startSave(async () => {
      const result = await updateDefendant(defendant.id, form)
      if (result?.error) {
        setError(result.error)
      } else {
        toast('Defendant info saved.', 'success')
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Edit Defendant Info</h2>
          <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="First Name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="John" />
          <InputField label="Last Name *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Smith" />
          <div>
            <InputField label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
            {fieldErrors.dob && <p className="mt-1 text-sm text-red-400">{fieldErrors.dob}</p>}
          </div>
          <div>
            <InputField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(214) 555-0100" />
            {fieldErrors.phone && <p className="mt-1 text-sm text-red-400">{fieldErrors.phone}</p>}
          </div>
          <div className="sm:col-span-2">
            <InputField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, Dallas TX 75201" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Check-in Frequency</label>
            <select
              value={form.checkinFrequency}
              onChange={(e) => setForm({ ...form, checkinFrequency: e.target.value as typeof form.checkinFrequency })}
              className={inputCls}
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Check-in Reminder Time (CT)</label>
            <select
              value={form.checkinHourCt}
              onChange={(e) => setForm({ ...form, checkinHourCt: Number(e.target.value) })}
              className={inputCls}
            >
              {CHECKIN_HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-60 min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className="px-5 py-3 rounded-xl font-medium text-base border border-white/20 text-slate-300 hover:bg-white/10 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {defendant.first_name} {defendant.last_name}
          </h1>
          <p className="text-slate-400 mt-1">
            Check-in: <span className="font-medium text-white">{FREQUENCY_LABELS[defendant.checkin_frequency]}</span>
            {' · '}
            <span className="font-medium text-white">{fmtHour(defendant.checkin_hour_ct ?? 8)}</span>
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-white/20',
            'text-slate-300 hover:bg-white/10 transition-colors min-h-[44px]'
          )}
        >
          <Pencil className="w-4 h-4" />
          Edit Info
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Date of Birth" value={defendant.dob} />
        <div>
          <p className="text-sm text-slate-400 mb-0.5">Phone</p>
          {defendant.phone ? (
            <PhoneButton
              phone={defendant.phone}
              calledName={`${defendant.first_name} ${defendant.last_name}`}
              defendantId={defendant.id}
              label={defendant.phone}
              variant="green"
            />
          ) : (
            <p className="text-lg text-slate-500 italic">Not provided</p>
          )}
        </div>
        <Field label="Address" value={defendant.address} />
      </div>
    </div>
  )
}
