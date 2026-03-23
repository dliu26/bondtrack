'use client'

import { useState } from 'react'
import { PlusCircle, Calendar, CreditCard, User, Clock, Check } from 'lucide-react'
import clsx from 'clsx'
import {
  updateCourtDateStatus,
  addCourtDate,
  markPaymentPaid,
  updateBondStatus,
} from '../actions'
import { toast } from '@/lib/toast'
import type { Bond, CourtDate, Payment, Cosigner, BondStatus, CourtDateStatus } from '@/types/database'
import { getDaysToDate, getDaysOverdue } from '@/lib/urgency'
import { formatDate } from '@/lib/date'
import { sanitizeText } from '@/lib/sanitize'
import PhoneButton from '@/components/PhoneButton'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return ` · ${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function currency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const bondStatusConfig: Record<BondStatus, { label: string; color: string }> = {
  active:     { label: 'Active',     color: 'bg-green-100 text-green-800' },
  forfeited:  { label: 'Forfeited',  color: 'bg-red-100 text-red-800' },
  exonerated: { label: 'Exonerated', color: 'bg-blue-100 text-blue-800' },
  closed:     { label: 'Closed',     color: 'bg-gray-100 text-gray-700' },
}

const courtStatusConfig: Record<CourtDateStatus, { label: string; color: string }> = {
  upcoming:  { label: 'Upcoming',  color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  missed:    { label: 'Missed',    color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

const paymentStatusConfig = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Paid',     color: 'bg-green-100 text-green-700' },
  overdue:  { label: 'Overdue',  color: 'bg-red-100 text-red-700' },
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void
  disabled: boolean
  className: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        className,
        'active:scale-95 transition-transform duration-75 disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

// ── Court date row ────────────────────────────────────────────────────────────

function CourtDateRow({
  cd,
  bondId,
  defendantId,
}: {
  cd: CourtDate
  bondId: string
  defendantId: string
}) {
  const [status, setStatus] = useState<CourtDateStatus>(cd.status)
  const [busy, setBusy] = useState(false)

  const cfg = courtStatusConfig[status]
  const daysTo = status === 'upcoming' ? getDaysToDate(cd.date) : null

  async function act(newStatus: CourtDateStatus) {
    let label: string
    if (newStatus === 'missed') {
      label = 'Mark this court date as MISSED? This will set a 90-day forfeiture deadline.'
    } else if (newStatus === 'completed') {
      const daysAway = getDaysToDate(cd.date)
      if (daysAway !== null && daysAway > 7) {
        label = `This court date is still ${daysAway} days away. Are you sure it was completed?`
      } else {
        label = 'Mark as completed?'
      }
    } else {
      label = `Mark as ${newStatus}?`
    }
    if (!confirm(label)) return

    const prev = status
    setStatus(newStatus)
    setBusy(true)
    const result = await updateCourtDateStatus(cd.id, newStatus, bondId, cd.date, defendantId)
    setBusy(false)
    if (result?.error) {
      setStatus(prev)
      toast(result.error, 'error')
    } else {
      toast('Court date updated.', 'success')
    }
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <Calendar className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{formatDate(cd.date)}{fmtTime(cd.time)}</span>
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
            {daysTo !== null && (
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                daysTo <= 3 ? 'bg-red-100 text-red-700' : daysTo <= 14 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              )}>
                {daysTo === 0 ? 'Today' : daysTo < 0 ? `${Math.abs(daysTo)}d ago` : `${daysTo}d away`}
              </span>
            )}
          </div>
          {cd.location && <p className="text-sm text-gray-500 mt-0.5">{sanitizeText(cd.location)}</p>}
        </div>
      </div>
      {status === 'upcoming' && (
        <div className="flex gap-2 mt-2 ml-7">
          <ActionButton
            onClick={() => act('completed')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 min-h-[44px]"
          >
            Completed
          </ActionButton>
          <ActionButton
            onClick={() => act('missed')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 min-h-[44px]"
          >
            Missed
          </ActionButton>
          <ActionButton
            onClick={() => act('cancelled')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 min-h-[44px]"
          >
            Cancel
          </ActionButton>
        </div>
      )}
    </div>
  )
}

// ── Add court date inline form ────────────────────────────────────────────────

function AddCourtDateForm({ bondId, defendantId, onDone }: { bondId: string; defendantId: string; onDone: () => void }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!date) { setError('Date is required.'); return }
    setBusy(true)
    const result = await addCourtDate(bondId, defendantId, { date, time, location })
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    toast('Court date added.', 'success')
    onDone()
  }

  return (
    <div className="mt-3 bg-blue-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Add Court Date</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="219th District Court, McKinney TX"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]" />
        </div>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex gap-2">
        <ActionButton
          onClick={handleSave}
          disabled={busy}
          className="flex items-center gap-1.5 bg-[#0f1e3c] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1a2f5a]"
        >
          <Check className="w-3.5 h-3.5" />
          {busy ? 'Saving…' : 'Save Date'}
        </ActionButton>
        <button
          onClick={onDone}
          className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors active:scale-95 duration-75"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({ payment, defendantId }: { payment: Payment; defendantId: string }) {
  const [status, setStatus] = useState(payment.status)
  const [busy, setBusy] = useState(false)

  const cfg = paymentStatusConfig[status]
  const daysOverdue = status === 'overdue' ? getDaysOverdue(payment.due_date) : null

  async function handleMarkPaid() {
    if (!confirm(`Mark $${payment.amount_due.toLocaleString()} as fully paid?`)) return
    const prev = status
    setStatus('paid')
    setBusy(true)
    const result = await markPaymentPaid(payment.id, payment.amount_due, defendantId)
    setBusy(false)
    if (result?.error) {
      setStatus(prev)
      toast(result.error, 'error')
    } else {
      toast('Payment marked as paid.', 'success')
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{currency(payment.amount_due)}</span>
          <span className="text-sm text-gray-500">due {formatDate(payment.due_date)}</span>
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
          {daysOverdue !== null && daysOverdue > 0 && (
            <span className="text-xs font-bold text-red-600">{daysOverdue}d overdue</span>
          )}
        </div>
        {payment.paid_at && (
          <p className="text-xs text-gray-400 mt-0.5">Paid {formatDate(payment.paid_at)}</p>
        )}
      </div>
      {status !== 'paid' && (
        <ActionButton
          onClick={handleMarkPaid}
          disabled={busy}
          className="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 min-h-[44px]"
        >
          Mark Paid
        </ActionButton>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface BondWithRelations extends Bond {
  cosigners: Cosigner[]
  court_dates: CourtDate[]
  payments: Payment[]
}

export default function BondDetailCard({
  bond,
  defendantId,
}: {
  bond: BondWithRelations
  defendantId: string
}) {
  const [addingDate, setAddingDate] = useState(false)
  const [bondStatus, setBondStatus] = useState<BondStatus>(bond.status)
  const [busyStatus, setBusyStatus] = useState(false)

  const scfg = bondStatusConfig[bondStatus]
  const sortedCourtDates = [...bond.court_dates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const sortedPayments = [...bond.payments].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as BondStatus

    // Warn: cannot reactivate forfeited
    if (bondStatus === 'forfeited' && newStatus === 'active') {
      toast('A forfeited bond cannot be set back to active.', 'error')
      e.currentTarget.value = bondStatus
      return
    }

    // Warn: closing with overdue payments
    const hasOverdue = bond.payments.some((p) => p.status === 'overdue')
    if ((newStatus === 'closed' || newStatus === 'exonerated') && hasOverdue) {
      if (!confirm('This bond has outstanding overdue payments. Are you sure you want to close it?')) {
        e.currentTarget.value = bondStatus
        return
      }
    }

    if (!confirm(`Change bond status to "${newStatus}"?`)) {
      e.currentTarget.value = bondStatus
      return
    }

    const prev = bondStatus
    setBondStatus(newStatus)
    setBusyStatus(true)
    const result = await updateBondStatus(bond.id, newStatus, defendantId)
    setBusyStatus(false)
    if (result?.error) {
      setBondStatus(prev)
      toast(result.error, 'error')
    } else {
      toast('Bond status updated.', 'success')
    }
  }

  const premiumRemaining = bond.premium_owed - bond.premium_paid
  const forfeitureDays = bond.forfeiture_deadline ? getDaysToDate(bond.forfeiture_deadline) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Bond header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold text-gray-900">{currency(bond.bond_amount)}</span>
              <span className={clsx('text-sm font-semibold px-3 py-1 rounded-full', scfg.color)}>{scfg.label}</span>
            </div>
            <p className="text-gray-500 mt-1 text-base">
              {[sanitizeText(bond.charge), bond.county ? `${sanitizeText(bond.county)} County` : null, sanitizeText(bond.court)]
                .filter(Boolean).join(' · ')}
            </p>
            {bond.case_number && (
              <p className="text-sm text-gray-400 mt-0.5">Case #{sanitizeText(bond.case_number)}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="text-gray-500">Premium owed</p>
              <p className="font-semibold text-gray-900">{currency(bond.premium_owed)}</p>
              {premiumRemaining > 0 && (
                <p className="text-red-600 font-medium">{currency(premiumRemaining)} remaining</p>
              )}
            </div>
            <select
              value={bondStatus}
              onChange={handleStatusChange}
              disabled={busyStatus}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] bg-white disabled:opacity-60 transition-opacity"
            >
              <option value="active">Active</option>
              <option value="forfeited">Forfeited</option>
              <option value="exonerated">Exonerated</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Forfeiture countdown */}
        {bond.forfeiture_deadline && (
          <div className={clsx(
            'mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
            forfeitureDays !== null && forfeitureDays <= 7
              ? 'bg-red-100 text-red-800'
              : forfeitureDays !== null && forfeitureDays <= 14
              ? 'bg-orange-100 text-orange-800'
              : 'bg-yellow-50 text-yellow-800'
          )}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              Forfeiture deadline: {formatDate(bond.forfeiture_deadline)}
              {forfeitureDays !== null && (
                <strong className="ml-1">
                  ({forfeitureDays <= 0 ? 'DEADLINE PASSED' : `${forfeitureDays} days remaining`})
                </strong>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {/* Court Dates */}
        <section className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Court Dates
            </h3>
            <button
              onClick={() => setAddingDate(!addingDate)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#0f1e3c] hover:underline active:scale-95 transition-transform duration-75"
            >
              <PlusCircle className="w-4 h-4" />
              Add Date
            </button>
          </div>

          {sortedCourtDates.length === 0 && !addingDate && (
            <p className="text-sm text-gray-400 py-2">No court dates on record.</p>
          )}

          {sortedCourtDates.map((cd) => (
            <CourtDateRow key={cd.id} cd={cd} bondId={bond.id} defendantId={defendantId} />
          ))}

          {addingDate && (
            <AddCourtDateForm
              bondId={bond.id}
              defendantId={defendantId}
              onDone={() => setAddingDate(false)}
            />
          )}
        </section>

        {/* Co-Signers */}
        {bond.cosigners.length > 0 && (
          <section className="px-6 py-4">
            <h3 className="font-semibold text-gray-700 text-base flex items-center gap-2 mb-3">
              <User className="w-4 h-4" /> Co-Signers
            </h3>
            <div className="space-y-3">
              {bond.cosigners.map((cs) => (
                <div key={cs.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-base">
                  <span className="font-medium text-gray-900">{cs.first_name} {cs.last_name}</span>
                  {cs.relationship && <span className="text-gray-500 text-sm">{cs.relationship}</span>}
                  {cs.phone && (
                    <PhoneButton
                      phone={cs.phone}
                      calledName={`Co-signer: ${cs.first_name} ${cs.last_name}`}
                      defendantId={defendantId}
                      label={cs.phone}
                      variant="gray"
                    />
                  )}
                  {cs.address && <span className="text-gray-400 text-sm">{sanitizeText(cs.address)}</span>}
                  {cs.assets_description && (
                    <span className="text-gray-500 text-sm italic">Assets: {sanitizeText(cs.assets_description)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payments */}
        <section className="px-6 py-4">
          <h3 className="font-semibold text-gray-700 text-base flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" /> Payment Plan
          </h3>
          {sortedPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No payments scheduled.</p>
          ) : (
            sortedPayments.map((p) => (
              <PaymentRow key={p.id} payment={p} defendantId={defendantId} />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
