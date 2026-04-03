'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, ChevronRight, ChevronLeft, Check, User } from 'lucide-react'
import clsx from 'clsx'
import { searchDefendants, createBond } from './actions'
import type { CreateBondInput } from './actions'
import type { CheckinFrequency } from '@/types/database'
import {
  validateDefendantStep,
  validateBondStep,
  validateCourtDateStep,
  validatePaymentsStep,
} from '@/lib/validation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DefendantForm {
  mode: 'search' | 'new'
  existingId: string
  existingName: string
  existingPhone: string
  firstName: string
  lastName: string
  dob: string
  phone: string
  address: string
  checkinFrequency: CheckinFrequency
  checkinHourCt: number
}

interface BondForm {
  bondAmount: string
  premiumOwed: string
  premiumPaid: string
  charge: string
  caseNumber: string
  county: string
  court: string
}

interface CosignerForm {
  firstName: string
  lastName: string
  phone: string
  address: string
  relationship: string
  assetsDescription: string
}

interface CourtDateForm {
  skip: boolean
  date: string
  time: string
  location: string
}

interface PaymentItem {
  amountDue: string
  dueDate: string
}

// ── Initial state ──────────────────────────────────────────────────────────────

const initialDefendant: DefendantForm = {
  mode: 'search',
  existingId: '',
  existingName: '',
  existingPhone: '',
  firstName: '',
  lastName: '',
  dob: '',
  phone: '',
  address: '',
  checkinFrequency: 'weekly',
  checkinHourCt: 8,
}

const CHECKIN_HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM–9 PM CT
function fmtHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:00 ${ampm} CT`
}

const initialBond: BondForm = {
  bondAmount: '',
  premiumOwed: '',
  premiumPaid: '0',
  charge: '',
  caseNumber: '',
  county: '',
  court: '',
}

const emptyPayment = (): PaymentItem => ({ amountDue: '', dueDate: '' })
const emptyCosigner = (): CosignerForm => ({
  firstName: '', lastName: '', phone: '', address: '', relationship: '', assetsDescription: '',
})

// ── Small helpers ──────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-base font-medium text-slate-300 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  className,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={clsx(inputCls, className)}
    />
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-400">{message}</p>
}

// ── Progress bar ───────────────────────────────────────────────────────────────

const STEPS = ['Defendant', 'Bond Details', 'Co-Signer', 'Court Date', 'Payment Plan']

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <div key={label} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'absolute top-4 left-1/2 w-full h-0.5 -z-0',
                    done ? 'bg-blue-500' : 'bg-white/10'
                  )}
                />
              )}
              {/* Dot */}
              <div
                className={clsx(
                  'relative z-10 rounded-full flex items-center justify-center font-bold transition-all',
                  done
                    ? 'w-8 h-8 text-sm bg-blue-600 text-white'
                    : active
                    ? 'w-10 h-10 text-base bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-md'
                    : 'w-8 h-8 text-sm bg-white/10 text-slate-400'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {/* Label */}
              <span
                className={clsx(
                  'mt-2 text-xs font-medium text-center hidden sm:block',
                  active ? 'text-white' : done ? 'text-slate-400' : 'text-slate-600'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 1: Defendant ──────────────────────────────────────────────────────────

function StepDefendant({
  form,
  setForm,
  errors = {},
}: {
  form: DefendantForm
  setForm: (f: DefendantForm) => void
  errors?: Record<string, string>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<
    Array<{ id: string; first_name: string; last_name: string; dob: string | null; phone: string | null }>
  >([])
  const [searching, startSearch] = useTransition()

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim().length < 2) {
        setResults([])
        return
      }
      startSearch(async () => {
        const res = await searchDefendants(value)
        setResults(res)
      })
    },
    []
  )

  function selectExisting(r: { id: string; first_name: string; last_name: string; phone: string | null }) {
    setForm({
      ...form,
      mode: 'search',
      existingId: r.id,
      existingName: `${r.first_name} ${r.last_name}`,
      existingPhone: r.phone ?? '',
    })
    setQuery('')
    setResults([])
  }

  function clearSelection() {
    setForm({ ...form, existingId: '', existingName: '' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Who is this bond for?</h2>
        <p className="text-slate-400 text-base">Find an existing defendant or add a new one.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-white/10 overflow-hidden">
        {(['search', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setForm({ ...form, mode: m, existingId: '', existingName: '' })}
            className={clsx(
              'flex-1 py-3 text-base font-medium transition-colors',
              form.mode === m
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            )}
          >
            {m === 'search' ? 'Find Existing Defendant' : 'Add New Defendant'}
          </button>
        ))}
      </div>

      {form.mode === 'search' && (
        <div>
          {form.existingId ? (
            /* Selected defendant card */
            <div className="flex items-center gap-4 p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-lg">{form.existingName}</p>
                {form.existingPhone && (
                  <p className="text-slate-400 text-sm">{form.existingPhone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-400 hover:text-white text-sm underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full pl-12 pr-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              {(results.length > 0 || (searching && query.length >= 2)) && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2d4f] border border-white/10 rounded-xl shadow-lg overflow-hidden">
                  {searching && (
                    <div className="px-4 py-3 text-slate-400 text-base">Searching…</div>
                  )}
                  {!searching && results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectExisting(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left border-b border-white/10 last:border-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {r.first_name} {r.last_name}
                        </p>
                        <p className="text-sm text-slate-400">
                          {r.phone ?? 'No phone'}{r.dob ? ` · DOB ${r.dob}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                  {!searching && results.length === 0 && query.length >= 2 && (
                    <div className="px-4 py-3 text-slate-400 text-base">
                      No defendants found.{' '}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, mode: 'new' })}
                        className="text-blue-400 font-semibold underline"
                      >
                        Add a new one?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {form.mode === 'new' && (
        <div className="space-y-4">
          <FieldRow>
            <Field>
              <Label required>First Name</Label>
              <Input value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="John" className={errors.firstName ? 'border-red-500/50' : ''} />
              <FieldError message={errors.firstName} />
            </Field>
            <Field>
              <Label required>Last Name</Label>
              <Input value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Smith" className={errors.lastName ? 'border-red-500/50' : ''} />
              <FieldError message={errors.lastName} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} className={errors.dob ? 'border-red-500/50' : ''} />
              <FieldError message={errors.dob} />
            </Field>
            <Field>
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(214) 555-0100" className={errors.phone ? 'border-red-500/50' : ''} />
              <FieldError message={errors.phone} />
            </Field>
          </FieldRow>
          <Field>
            <Label>Address</Label>
            <Input value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, Dallas TX 75201" />
          </Field>
          <Field>
            <Label>Check-in Frequency</Label>
            <select
              value={form.checkinFrequency}
              onChange={(e) => setForm({ ...form, checkinFrequency: e.target.value as CheckinFrequency })}
              className={inputCls}
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field>
            <Label>Check-in Reminder Time (CT)</Label>
            <select
              value={form.checkinHourCt}
              onChange={(e) => setForm({ ...form, checkinHourCt: Number(e.target.value) })}
              className={inputCls}
            >
              {CHECKIN_HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Bond Details ───────────────────────────────────────────────────────

function StepBond({
  form,
  setForm,
  errors = {},
}: {
  form: BondForm
  setForm: (f: BondForm) => void
  errors?: Record<string, string>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Bond Details</h2>
        <p className="text-slate-400 text-base">Enter the financial and case information.</p>
      </div>

      <FieldRow>
        <Field>
          <Label required>Bond Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base">$</span>
            <Input type="number" value={form.bondAmount} onChange={(v) => setForm({ ...form, bondAmount: v })} placeholder="25000" className={clsx('pl-8', errors.bondAmount && 'border-red-500/50')} />
          </div>
          <FieldError message={errors.bondAmount} />
        </Field>
        <Field>
          <Label required>Premium Owed</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base">$</span>
            <Input type="number" value={form.premiumOwed} onChange={(v) => setForm({ ...form, premiumOwed: v })} placeholder="2500" className={clsx('pl-8', errors.premiumOwed && 'border-red-500/50')} />
          </div>
          <FieldError message={errors.premiumOwed} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <Label>Premium Paid So Far</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base">$</span>
            <Input type="number" value={form.premiumPaid} onChange={(v) => setForm({ ...form, premiumPaid: v })} placeholder="0" className={clsx('pl-8', errors.premiumPaid && 'border-red-500/50')} />
          </div>
          <FieldError message={errors.premiumPaid} />
        </Field>
        <Field>
          <Label>Charge / Offense</Label>
          <Input value={form.charge} onChange={(v) => setForm({ ...form, charge: v })} placeholder="DWI, Assault, etc." />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <Label>Case Number</Label>
          <Input value={form.caseNumber} onChange={(v) => setForm({ ...form, caseNumber: v })} placeholder="CR-2026-00123" className={errors.caseNumber ? 'border-red-500/50' : ''} />
          <FieldError message={errors.caseNumber} />
        </Field>
        <Field>
          <Label>County</Label>
          <Input value={form.county} onChange={(v) => setForm({ ...form, county: v })} placeholder="Collin County" />
        </Field>
      </FieldRow>

      <Field>
        <Label>Court</Label>
        <Input value={form.court} onChange={(v) => setForm({ ...form, court: v })} placeholder="219th District Court" />
      </Field>
    </div>
  )
}

// ── Step 3: Co-Signer ──────────────────────────────────────────────────────────

function StepCosigner({
  cosigners,
  setCosigners,
}: {
  cosigners: CosignerForm[]
  setCosigners: (c: CosignerForm[]) => void
}) {
  function update(i: number, field: keyof CosignerForm, value: string) {
    const updated = [...cosigners]
    updated[i] = { ...updated[i], [field]: value }
    setCosigners(updated)
  }

  function remove(i: number) {
    setCosigners(cosigners.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Co-Signer</h2>
        <p className="text-slate-400 text-base">Optional. Add anyone who co-signed the bond.</p>
      </div>

      {cosigners.length === 0 && (
        <div className="text-center py-10 bg-white/5 rounded-xl border-2 border-dashed border-white/10">
          <p className="text-slate-400 text-lg mb-4">No co-signers added yet.</p>
          <button
            type="button"
            onClick={() => setCosigners([emptyCosigner()])}
            className="inline-flex items-center gap-2 text-blue-400 font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Co-Signer
          </button>
        </div>
      )}

      {cosigners.map((cosigner, i) => (
        <div key={i} className="bg-white/5 rounded-xl p-5 space-y-4 relative border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-slate-300 text-base">Co-Signer {i + 1}</p>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <FieldRow>
            <Field>
              <Label required>First Name</Label>
              <Input value={cosigner.firstName} onChange={(v) => update(i, 'firstName', v)} placeholder="Jane" />
            </Field>
            <Field>
              <Label required>Last Name</Label>
              <Input value={cosigner.lastName} onChange={(v) => update(i, 'lastName', v)} placeholder="Smith" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field>
              <Label>Phone</Label>
              <Input value={cosigner.phone} onChange={(v) => update(i, 'phone', v)} placeholder="(214) 555-0100" />
            </Field>
            <Field>
              <Label>Relationship</Label>
              <Input value={cosigner.relationship} onChange={(v) => update(i, 'relationship', v)} placeholder="Mother, Spouse, etc." />
            </Field>
          </FieldRow>
          <Field>
            <Label>Address</Label>
            <Input value={cosigner.address} onChange={(v) => update(i, 'address', v)} placeholder="123 Main St, Dallas TX" />
          </Field>
          <Field>
            <Label>Assets / Collateral Description</Label>
            <textarea
              value={cosigner.assetsDescription}
              onChange={(e) => update(i, 'assetsDescription', e.target.value)}
              placeholder="2018 Ford F-150, home equity, etc."
              rows={2}
              className="w-full px-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </Field>
        </div>
      ))}

      {cosigners.length > 0 && (
        <button
          type="button"
          onClick={() => setCosigners([...cosigners, emptyCosigner()])}
          className="flex items-center gap-2 text-blue-400 font-semibold text-base hover:underline"
        >
          <Plus className="w-4 h-4" />
          Add Another Co-Signer
        </button>
      )}
    </div>
  )
}

// ── Step 4: Court Date ─────────────────────────────────────────────────────────

function StepCourtDate({
  form,
  setForm,
  errors = {},
}: {
  form: CourtDateForm
  setForm: (f: CourtDateForm) => void
  errors?: Record<string, string>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">First Court Date</h2>
        <p className="text-slate-400 text-base">Add the initial hearing date. You can add more later.</p>
      </div>

      <div className="flex rounded-xl border border-white/10 overflow-hidden">
        {[false, true].map((skip) => (
          <button
            key={String(skip)}
            type="button"
            onClick={() => setForm({ ...form, skip })}
            className={clsx(
              'flex-1 py-3 text-base font-medium transition-colors',
              form.skip === skip
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            )}
          >
            {skip ? 'No court date yet' : 'Enter court date'}
          </button>
        ))}
      </div>

      {!form.skip && (
        <div className="space-y-4">
          <FieldRow>
            <Field>
              <Label required>Date</Label>
              <Input type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} className={errors.date ? 'border-red-500/50' : ''} />
              <FieldError message={errors.date} />
            </Field>
            <Field>
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} />
            </Field>
          </FieldRow>
          <Field>
            <Label>Courthouse / Location</Label>
            <Input
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="219th District Court, 2100 Bloomdale Rd, McKinney TX"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

// ── Step 5: Payment Plan ───────────────────────────────────────────────────────

function StepPayments({
  payments,
  setPayments,
  premiumOwed,
  errors = {},
}: {
  payments: PaymentItem[]
  setPayments: (p: PaymentItem[]) => void
  premiumOwed: string
  errors?: Record<string, string>
}) {
  const [numPayments, setNumPayments] = useState('3')

  function generatePayments() {
    const count = parseInt(numPayments) || 1
    const total = parseFloat(premiumOwed) || 0
    const perPayment = total > 0 ? (total / count).toFixed(2) : ''

    const today = new Date()
    const generated = Array.from({ length: count }, (_, i) => {
      const due = new Date(today)
      due.setMonth(due.getMonth() + i + 1)
      return {
        amountDue: perPayment,
        dueDate: due.toISOString().split('T')[0],
      }
    })
    setPayments(generated)
  }

  function update(i: number, field: keyof PaymentItem, value: string) {
    const updated = [...payments]
    updated[i] = { ...updated[i], [field]: value }
    setPayments(updated)
  }

  function remove(i: number) {
    setPayments(payments.filter((_, idx) => idx !== i))
  }

  const remainingOwed = parseFloat(premiumOwed) || 0
  const totalScheduled = payments.reduce((sum, p) => sum + (parseFloat(p.amountDue) || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Payment Plan</h2>
        <p className="text-slate-400 text-base">
          Schedule premium installments.{' '}
          {remainingOwed > 0 && (
            <span className="font-medium text-slate-300">
              Total owed:{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingOwed)}
            </span>
          )}
        </p>
      </div>

      {/* Quick generate */}
      <div className="bg-blue-900/30 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="text-base font-medium text-slate-300">Generate equal payments:</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="36"
            value={numPayments}
            onChange={(e) => setNumPayments(e.target.value)}
            className="w-20 px-3 py-2 text-base bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-slate-400">payments</span>
        </div>
        <button
          type="button"
          onClick={generatePayments}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors"
        >
          Generate
        </button>
      </div>

      {payments.length === 0 && (
        <div className="text-center py-10 bg-white/5 rounded-xl border-2 border-dashed border-white/10">
          <p className="text-slate-400 text-lg mb-4">No payments scheduled yet.</p>
          <button
            type="button"
            onClick={() => setPayments([emptyPayment()])}
            className="inline-flex items-center gap-2 text-blue-400 font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p, i) => (
            <div key={i} className="bg-white/5 rounded-xl px-4 py-3 space-y-1 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-sm font-medium w-6 shrink-0">#{i + 1}</span>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={p.amountDue}
                      onChange={(e) => update(i, 'amountDue', e.target.value)}
                      placeholder="Amount"
                      className={clsx('w-full pl-7 pr-3 py-2.5 text-base bg-white/5 border rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400', errors[`payment_${i}_amount`] ? 'border-red-500/50' : 'border-white/10')}
                    />
                  </div>
                  <input
                    type="date"
                    value={p.dueDate}
                    onChange={(e) => update(i, 'dueDate', e.target.value)}
                    className={clsx('w-full px-3 py-2.5 text-base bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400', errors[`payment_${i}_date`] ? 'border-red-500/50' : 'border-white/10')}
                  />
                </div>
                <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-300 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {errors[`payment_${i}_amount`] && <p className="text-xs text-red-400 ml-9">{errors[`payment_${i}_amount`]}</p>}
              {errors[`payment_${i}_date`] && <p className="text-xs text-red-400 ml-9">{errors[`payment_${i}_date`]}</p>}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPayments([...payments, emptyPayment()])}
            className="flex items-center gap-2 text-blue-400 font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Another Payment
          </button>

          {remainingOwed > 0 && (
            <div
              className={clsx(
                'text-sm font-medium px-4 py-2 rounded-lg',
                Math.abs(totalScheduled - remainingOwed) < 0.01
                  ? 'text-green-400 bg-green-900/30'
                  : totalScheduled > remainingOwed
                  ? 'text-red-400 bg-red-900/30'
                  : 'text-amber-300 bg-amber-900/30'
              )}
            >
              Scheduled:{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalScheduled)}
              {' '}of{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingOwed)}
              {' '}premium owed
            </div>
          )}
          {errors.total && <p className="text-sm text-red-400">{errors.total}</p>}
        </div>
      )}
    </div>
  )
}

// ── Validation ─────────────────────────────────────────────────────────────────

function getStepErrors(
  step: number,
  defendant: DefendantForm,
  bond: BondForm,
  courtDate: CourtDateForm,
  payments: PaymentItem[]
): Record<string, string> {
  if (step === 0) return validateDefendantStep(defendant)
  if (step === 1) return validateBondStep(bond)
  if (step === 3) return validateCourtDateStep(courtDate)
  if (step === 4) return validatePaymentsStep(payments, bond.premiumOwed)
  return {}
}

function canProceed(
  step: number,
  defendant: DefendantForm,
  bond: BondForm,
  courtDate: CourtDateForm
): boolean {
  if (step === 0) {
    if (defendant.mode === 'search') return !!defendant.existingId
    return !!defendant.firstName.trim() && !!defendant.lastName.trim()
  }
  if (step === 1) {
    return !!bond.bondAmount && parseFloat(bond.bondAmount) > 0 && bond.premiumOwed !== ''
  }
  if (step === 3) {
    return courtDate.skip || !!courtDate.date
  }
  return true
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function NewBondPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [defendant, setDefendant] = useState<DefendantForm>(initialDefendant)
  const [bond, setBond] = useState<BondForm>(initialBond)
  const [cosigners, setCosigners] = useState<CosignerForm[]>([])
  const [courtDate, setCourtDate] = useState<CourtDateForm>({ skip: false, date: '', time: '', location: '' })
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()

  const proceed = canProceed(step, defendant, bond, courtDate)

  function next() {
    const errs = getStepErrors(step, defendant, bond, courtDate, payments)
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setFieldErrors({})
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleSubmit() {
    setSubmitError(null)
    startSubmit(async () => {
      const input: CreateBondInput = {
        defendant: {
          mode: defendant.mode === 'search' ? 'existing' : 'new',
          existingId: defendant.existingId || undefined,
          firstName: defendant.firstName,
          lastName: defendant.lastName,
          dob: defendant.dob,
          phone: defendant.phone,
          address: defendant.address,
          checkinFrequency: defendant.checkinFrequency,
          checkinHourCt: defendant.checkinHourCt,
        },
        bond: {
          bondAmount: parseFloat(bond.bondAmount) || 0,
          premiumOwed: parseFloat(bond.premiumOwed) || 0,
          premiumPaid: parseFloat(bond.premiumPaid) || 0,
          charge: bond.charge,
          caseNumber: bond.caseNumber,
          county: bond.county,
          court: bond.court,
        },
        cosigners: cosigners.filter((c) => c.firstName.trim() && c.lastName.trim()),
        courtDate: {
          skip: courtDate.skip,
          date: courtDate.date,
          time: courtDate.time,
          location: courtDate.location,
        },
        payments: payments
          .filter((p) => p.amountDue && p.dueDate)
          .map((p) => ({ amountDue: parseFloat(p.amountDue), dueDate: p.dueDate })),
      }

      const result = await createBond(input)
      if (result?.error) {
        setSubmitError(result.error)
      }
      // On success, createBond() calls redirect() server-side → navigates automatically
    })
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-2xl">
      {/* Page header */}
      <div className="mb-6 md:mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-base mb-4 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Add New Bond</h1>
      </div>

      {/* Progress */}
      <ProgressBar current={step} />

      {/* Step content */}
      <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg p-5 md:p-8 mb-6">
        {step === 0 && <StepDefendant form={defendant} setForm={(f) => { setDefendant(f); setFieldErrors({}) }} errors={fieldErrors} />}
        {step === 1 && <StepBond form={bond} setForm={(f) => { setBond(f); setFieldErrors({}) }} errors={fieldErrors} />}
        {step === 2 && <StepCosigner cosigners={cosigners} setCosigners={setCosigners} />}
        {step === 3 && <StepCourtDate form={courtDate} setForm={(f) => { setCourtDate(f); setFieldErrors({}) }} errors={fieldErrors} />}
        {step === 4 && (
          <StepPayments
            payments={payments}
            setPayments={(p) => { setPayments(p); setFieldErrors({}) }}
            premiumOwed={bond.premiumOwed}
            errors={fieldErrors}
          />
        )}
      </div>

      {submitError && (
        <div className="mb-4 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-base">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className={clsx(
            'flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-colors min-h-[44px]',
            step === 0
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 border border-white/20 hover:bg-white/10'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={!proceed}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Next Step
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-green-700 text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
          >
            {submitting ? 'Saving…' : 'Save Bond'}
            {!submitting && <Check className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
