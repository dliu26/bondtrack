'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, ChevronRight, ChevronLeft, Check, User } from 'lucide-react'
import clsx from 'clsx'
import { searchDefendants, createBond } from './actions'
import type { CreateBondInput } from './actions'
import type { CheckinFrequency } from '@/types/database'

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

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-base font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
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
      className={clsx(
        'w-full px-4 py-3 text-lg border border-gray-300 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] focus:border-transparent',
        className
      )}
    />
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
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
                    done ? 'bg-[#0f1e3c]' : 'bg-gray-200'
                  )}
                />
              )}
              {/* Dot */}
              <div
                className={clsx(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  done
                    ? 'bg-[#0f1e3c] text-white'
                    : active
                    ? 'bg-[#0f1e3c] text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-400'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {/* Label */}
              <span
                className={clsx(
                  'mt-2 text-xs font-medium text-center hidden sm:block',
                  active ? 'text-[#0f1e3c]' : done ? 'text-gray-600' : 'text-gray-400'
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
}: {
  form: DefendantForm
  setForm: (f: DefendantForm) => void
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
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Who is this bond for?</h2>
        <p className="text-gray-500 text-base">Find an existing defendant or add a new one.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-gray-300 overflow-hidden">
        {(['search', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setForm({ ...form, mode: m, existingId: '', existingName: '' })}
            className={clsx(
              'flex-1 py-3 text-base font-medium transition-colors',
              form.mode === m
                ? 'bg-[#0f1e3c] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
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
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-300 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#0f1e3c] flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{form.existingName}</p>
                {form.existingPhone && (
                  <p className="text-gray-500 text-sm">{form.existingPhone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-700 text-sm underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] focus:border-transparent"
                />
              </div>
              {(results.length > 0 || (searching && query.length >= 2)) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {searching && (
                    <div className="px-4 py-3 text-gray-400 text-base">Searching…</div>
                  )}
                  {!searching && results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectExisting(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {r.first_name} {r.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {r.phone ?? 'No phone'}{r.dob ? ` · DOB ${r.dob}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                  {!searching && results.length === 0 && query.length >= 2 && (
                    <div className="px-4 py-3 text-gray-500 text-base">
                      No defendants found.{' '}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, mode: 'new' })}
                        className="text-[#0f1e3c] font-semibold underline"
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
              <Input value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="John" />
            </Field>
            <Field>
              <Label required>Last Name</Label>
              <Input value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Smith" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
            </Field>
            <Field>
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(214) 555-0100" />
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
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Bond Details ───────────────────────────────────────────────────────

function StepBond({ form, setForm }: { form: BondForm; setForm: (f: BondForm) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Bond Details</h2>
        <p className="text-gray-500 text-base">Enter the financial and case information.</p>
      </div>

      <FieldRow>
        <Field>
          <Label required>Bond Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
            <Input
              type="number"
              value={form.bondAmount}
              onChange={(v) => setForm({ ...form, bondAmount: v })}
              placeholder="50000"
              className="pl-8"
            />
          </div>
        </Field>
        <Field>
          <Label required>Premium Owed</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
            <Input
              type="number"
              value={form.premiumOwed}
              onChange={(v) => setForm({ ...form, premiumOwed: v })}
              placeholder="5000"
              className="pl-8"
            />
          </div>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <Label>Premium Paid So Far</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
            <Input
              type="number"
              value={form.premiumPaid}
              onChange={(v) => setForm({ ...form, premiumPaid: v })}
              placeholder="0"
              className="pl-8"
            />
          </div>
        </Field>
        <Field>
          <Label>Charge / Offense</Label>
          <Input
            value={form.charge}
            onChange={(v) => setForm({ ...form, charge: v })}
            placeholder="DWI, Assault, etc."
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <Label>Case Number</Label>
          <Input
            value={form.caseNumber}
            onChange={(v) => setForm({ ...form, caseNumber: v })}
            placeholder="2024-CR-001234"
          />
        </Field>
        <Field>
          <Label>County</Label>
          <Input
            value={form.county}
            onChange={(v) => setForm({ ...form, county: v })}
            placeholder="Collin"
          />
        </Field>
      </FieldRow>

      <Field>
        <Label>Court</Label>
        <Input
          value={form.court}
          onChange={(v) => setForm({ ...form, court: v })}
          placeholder="219th District Court"
        />
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
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Co-Signer</h2>
        <p className="text-gray-500 text-base">Optional. Add anyone who co-signed the bond.</p>
      </div>

      {cosigners.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">No co-signers added yet.</p>
          <button
            type="button"
            onClick={() => setCosigners([emptyCosigner()])}
            className="inline-flex items-center gap-2 text-[#0f1e3c] font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Co-Signer
          </button>
        </div>
      )}

      {cosigners.map((cosigner, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-5 space-y-4 relative">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-700 text-base">Co-Signer {i + 1}</p>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600 transition-colors"
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
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] resize-none"
            />
          </Field>
        </div>
      ))}

      {cosigners.length > 0 && (
        <button
          type="button"
          onClick={() => setCosigners([...cosigners, emptyCosigner()])}
          className="flex items-center gap-2 text-[#0f1e3c] font-semibold text-base hover:underline"
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
}: {
  form: CourtDateForm
  setForm: (f: CourtDateForm) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">First Court Date</h2>
        <p className="text-gray-500 text-base">Add the initial hearing date. You can add more later.</p>
      </div>

      <div className="flex rounded-xl border border-gray-300 overflow-hidden">
        {[false, true].map((skip) => (
          <button
            key={String(skip)}
            type="button"
            onClick={() => setForm({ ...form, skip })}
            className={clsx(
              'flex-1 py-3 text-base font-medium transition-colors',
              form.skip === skip
                ? 'bg-[#0f1e3c] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
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
              <Input type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
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
}: {
  payments: PaymentItem[]
  setPayments: (p: PaymentItem[]) => void
  premiumOwed: string
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
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Plan</h2>
        <p className="text-gray-500 text-base">
          Schedule premium installments.{' '}
          {remainingOwed > 0 && (
            <span className="font-medium text-gray-700">
              Total owed:{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingOwed)}
            </span>
          )}
        </p>
      </div>

      {/* Quick generate */}
      <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="text-base font-medium text-gray-700">Generate equal payments:</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="36"
            value={numPayments}
            onChange={(e) => setNumPayments(e.target.value)}
            className="w-20 px-3 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
          />
          <span className="text-gray-600">payments</span>
        </div>
        <button
          type="button"
          onClick={generatePayments}
          className="bg-[#0f1e3c] text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-[#1a2f5a] transition-colors"
        >
          Generate
        </button>
      </div>

      {payments.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">No payments scheduled yet.</p>
          <button
            type="button"
            onClick={() => setPayments([emptyPayment()])}
            className="inline-flex items-center gap-2 text-[#0f1e3c] font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-gray-500 text-sm font-medium w-6 shrink-0">#{i + 1}</span>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={p.amountDue}
                    onChange={(e) => update(i, 'amountDue', e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-7 pr-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
                  />
                </div>
                <input
                  type="date"
                  value={p.dueDate}
                  onChange={(e) => update(i, 'dueDate', e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPayments([...payments, emptyPayment()])}
            className="flex items-center gap-2 text-[#0f1e3c] font-semibold text-base hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Another Payment
          </button>

          {remainingOwed > 0 && (
            <div
              className={clsx(
                'text-sm font-medium px-4 py-2 rounded-lg',
                Math.abs(totalScheduled - remainingOwed) < 0.01
                  ? 'text-green-700 bg-green-50'
                  : totalScheduled > remainingOwed
                  ? 'text-red-700 bg-red-50'
                  : 'text-yellow-700 bg-yellow-50'
              )}
            >
              Scheduled:{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalScheduled)}
              {' '}of{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingOwed)}
              {' '}premium owed
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateStep(
  step: number,
  defendant: DefendantForm,
  bond: BondForm
): string | null {
  if (step === 0) {
    if (defendant.mode === 'search' && !defendant.existingId) {
      return 'Please select an existing defendant or switch to "Add New".'
    }
    if (defendant.mode === 'new' && (!defendant.firstName.trim() || !defendant.lastName.trim())) {
      return 'First name and last name are required.'
    }
  }
  if (step === 1) {
    if (!bond.bondAmount || parseFloat(bond.bondAmount) <= 0) {
      return 'Bond amount is required and must be greater than zero.'
    }
    if (!bond.premiumOwed || parseFloat(bond.premiumOwed) < 0) {
      return 'Premium owed is required.'
    }
  }
  return null
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
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()

  function next() {
    const err = validateStep(step, defendant, bond)
    if (err) { setValidationError(err); return }
    setValidationError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setValidationError(null)
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
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-base mb-4 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Add New Bond</h1>
      </div>

      {/* Progress */}
      <ProgressBar current={step} />

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
        {step === 0 && <StepDefendant form={defendant} setForm={setDefendant} />}
        {step === 1 && <StepBond form={bond} setForm={setBond} />}
        {step === 2 && <StepCosigner cosigners={cosigners} setCosigners={setCosigners} />}
        {step === 3 && <StepCourtDate form={courtDate} setForm={setCourtDate} />}
        {step === 4 && (
          <StepPayments
            payments={payments}
            setPayments={setPayments}
            premiumOwed={bond.premiumOwed}
          />
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
          {validationError}
        </div>
      )}
      {submitError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
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
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="flex items-center gap-2 bg-[#0f1e3c] text-white px-6 py-3 rounded-xl text-base font-semibold hover:bg-[#1a2f5a] transition-colors min-h-[44px]"
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
