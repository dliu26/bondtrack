'use client'

import { useState } from 'react'
import { PlusCircle, Calendar, CreditCard, User, Clock, Check, AlertTriangle } from 'lucide-react'
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
  active:     { label: 'Active',     color: 'bg-green-900/40 text-green-400' },
  forfeited:  { label: 'Forfeited',  color: 'bg-red-900/40 text-red-400'    },
  exonerated: { label: 'Exonerated', color: 'bg-blue-900/40 text-blue-300'  },
  closed:     { label: 'Closed',     color: 'bg-white/10 text-slate-400'    },
}

const courtStatusConfig: Record<CourtDateStatus, { label: string; color: string }> = {
  upcoming:  { label: 'Upcoming',  color: 'bg-blue-900/40 text-blue-300'  },
  completed: { label: 'Completed', color: 'bg-green-900/40 text-green-400' },
  missed:    { label: 'Missed',    color: 'bg-red-900/40 text-red-400'    },
  cancelled: { label: 'Cancelled', color: 'bg-white/10 text-slate-400'    },
}

const paymentStatusConfig = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-900/40 text-blue-300'  },
  paid:     { label: 'Paid',     color: 'bg-green-900/40 text-green-400' },
  overdue:  { label: 'Overdue',  color: 'bg-red-900/40 text-red-400'    },
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400'

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
    <div className="py-3 border-b border-white/10 last:border-0">
      <div className="flex items-start gap-3">
        <Calendar className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{formatDate(cd.date)}{fmtTime(cd.time)}</span>
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
            {daysTo !== null && (
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                daysTo <= 3 ? 'bg-red-900/40 text-red-400' : daysTo <= 14 ? 'bg-amber-900/40 text-amber-300' : 'bg-white/10 text-slate-400'
              )}>
                {daysTo === 0 ? 'Today' : daysTo < 0 ? `${Math.abs(daysTo)}d ago` : `${daysTo}d away`}
              </span>
            )}
            {cd.source === 'scraped' && (
              <span
                title="Auto-scraped — verify with court"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300 cursor-default"
              >
                <AlertTriangle className="w-3 h-3" />
                Auto-scraped
              </span>
            )}
          </div>
          {cd.location && <p className="text-sm text-slate-400 mt-0.5">{sanitizeText(cd.location)}</p>}
        </div>
      </div>
      {status === 'upcoming' && (
        <div className="flex gap-2 mt-2 ml-7">
          <ActionButton
            onClick={() => act('completed')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 min-h-[44px]"
          >
            Completed
          </ActionButton>
          <ActionButton
            onClick={() => act('missed')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 min-h-[44px]"
          >
            Missed
          </ActionButton>
          <ActionButton
            onClick={() => act('cancelled')}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 min-h-[44px]"
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
    <div className="mt-3 bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
      <p className="text-sm font-semibold text-white">Add Court Date</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="219th District Court, McKinney TX"
            className={inputCls} />
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <ActionButton
          onClick={handleSave}
          disabled={busy}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Check className="w-3.5 h-3.5" />
          {busy ? 'Saving…' : 'Save Date'}
        </ActionButton>
        <button
          onClick={onDone}
          className="text-sm font-medium text-slate-400 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95 duration-75"
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
    <div className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0">
      <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">{currency(payment.amount_due)}</span>
          <span className="text-sm text-slate-400">due {formatDate(payment.due_date)}</span>
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
          {daysOverdue !== null && daysOverdue > 0 && (
            <span className="text-xs font-bold text-red-400">{daysOverdue}d overdue</span>
          )}
        </div>
        {payment.paid_at && (
          <p className="text-xs text-slate-500 mt-0.5">Paid {formatDate(payment.paid_at)}</p>
        )}
      </div>
      {status !== 'paid' && (
        <ActionButton
          onClick={handleMarkPaid}
          disabled={busy}
          className="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 min-h-[44px]"
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

    if (bondStatus === 'forfeited' && newStatus === 'active') {
      toast('A forfeited bond cannot be set back to active.', 'error')
      e.currentTarget.value = bondStatus
      return
    }

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
    <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
      {/* Bond header */}
      <div className="bg-white/5 px-6 py-4 border-b border-white/10">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold text-white">{currency(bond.bond_amount)}</span>
              <span className={clsx('text-sm font-semibold px-3 py-1 rounded-full', scfg.color)}>{scfg.label}</span>
            </div>
            <p className="text-slate-400 mt-1 text-base">
              {[sanitizeText(bond.charge), bond.county ? `${sanitizeText(bond.county)} County` : null, sanitizeText(bond.court)]
                .filter(Boolean).join(' · ')}
            </p>
            {bond.case_number && (
              <p className="text-sm text-slate-500 mt-0.5">Case #{sanitizeText(bond.case_number)}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="text-slate-400">Premium owed</p>
              <p className="font-semibold text-white">{currency(bond.premium_owed)}</p>
              {premiumRemaining > 0 && (
                <p className="text-red-400 font-medium">{currency(premiumRemaining)} remaining</p>
              )}
            </div>
            <select
              value={bondStatus}
              onChange={handleStatusChange}
              disabled={busyStatus}
              className="text-sm bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 transition-opacity"
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
              ? 'bg-red-900/40 text-red-400'
              : forfeitureDays !== null && forfeitureDays <= 14
              ? 'bg-orange-900/40 text-orange-300'
              : 'bg-amber-900/30 text-amber-300'
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

      <div className="divide-y divide-white/10">
        {/* Court Dates */}
        <section className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-300 text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Court Dates
            </h3>
            <button
              onClick={() => setAddingDate(!addingDate)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:underline active:scale-95 transition-transform duration-75"
            >
              <PlusCircle className="w-4 h-4" />
              Add Date
            </button>
          </div>

          {sortedCourtDates.length === 0 && !addingDate && (
            <p className="text-sm text-slate-500 py-2">No court dates on record.</p>
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
            <h3 className="font-semibold text-slate-300 text-base flex items-center gap-2 mb-3">
              <User className="w-4 h-4" /> Co-Signers
            </h3>
            <div className="space-y-3">
              {bond.cosigners.map((cs) => (
                <div key={cs.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-base">
                  <span className="font-medium text-white">{cs.first_name} {cs.last_name}</span>
                  {cs.relationship && <span className="text-slate-400 text-sm">{cs.relationship}</span>}
                  {cs.phone && (
                    <PhoneButton
                      phone={cs.phone}
                      calledName={`Co-signer: ${cs.first_name} ${cs.last_name}`}
                      defendantId={defendantId}
                      label={cs.phone}
                      variant="gray"
                    />
                  )}
                  {cs.address && <span className="text-slate-400 text-sm">{sanitizeText(cs.address)}</span>}
                  {cs.assets_description && (
                    <span className="text-slate-400 text-sm italic">Assets: {sanitizeText(cs.assets_description)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payments */}
        <section className="px-6 py-4">
          <h3 className="font-semibold text-slate-300 text-base flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" /> Payment Plan
          </h3>
          {sortedPayments.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No payments scheduled.</p>
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
