'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { PlusCircle, Calendar, CreditCard, User, Clock, Check } from 'lucide-react'
import clsx from 'clsx'
import {
  updateCourtDateStatus,
  addCourtDate,
  markPaymentPaid,
  updateBondStatus,
} from '../actions'
import type { Bond, CourtDate, Payment, Cosigner, BondStatus } from '@/types/database'
import { getDaysToDate, getDaysOverdue } from '@/lib/urgency'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(isoDate: string) {
  return format(parseISO(isoDate), 'MMM d, yyyy')
}

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

const courtStatusConfig = {
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
  const [pending, startAction] = useTransition()
  const cfg = courtStatusConfig[cd.status]
  const daysTo = cd.status === 'upcoming' ? getDaysToDate(cd.date) : null

  function act(newStatus: CourtDate['status']) {
    const label = newStatus === 'missed' ? 'Mark this court date as MISSED? This will set a 90-day forfeiture deadline.' : `Mark as ${newStatus}?`
    if (!confirm(label)) return
    startAction(async () => {
      await updateCourtDateStatus(cd.id, newStatus, bondId, cd.date, defendantId)
    })
  }

  return (
    <div className={clsx('flex items-start gap-3 py-3 border-b border-gray-100 last:border-0', pending && 'opacity-50')}>
      <Calendar className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{fmt(cd.date)}{fmtTime(cd.time)}</span>
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
        {cd.location && <p className="text-sm text-gray-500 mt-0.5">{cd.location}</p>}
      </div>
      {cd.status === 'upcoming' && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => act('completed')}
            disabled={pending}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            Completed
          </button>
          <button
            onClick={() => act('missed')}
            disabled={pending}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            Missed
          </button>
          <button
            onClick={() => act('cancelled')}
            disabled={pending}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
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
  const [saving, startSave] = useTransition()
  const [error, setError] = useState('')

  function handleSave() {
    if (!date) { setError('Date is required.'); return }
    startSave(async () => {
      const result = await addCourtDate(bondId, defendantId, { date, time, location })
      if (result?.error) { setError(result.error); return }
      onDone()
    })
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
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-[#0f1e3c] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1a2f5a] transition-colors disabled:opacity-60">
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save Date'}
        </button>
        <button onClick={onDone} className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({ payment, defendantId }: { payment: Payment; defendantId: string }) {
  const [pending, startAction] = useTransition()
  const cfg = paymentStatusConfig[payment.status]
  const daysOverdue = payment.status === 'overdue' ? getDaysOverdue(payment.due_date) : null

  function handleMarkPaid() {
    if (!confirm(`Mark $${payment.amount_due.toLocaleString()} as fully paid?`)) return
    startAction(async () => {
      await markPaymentPaid(payment.id, payment.amount_due, defendantId)
    })
  }

  return (
    <div className={clsx('flex items-center gap-3 py-3 border-b border-gray-100 last:border-0', pending && 'opacity-50')}>
      <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{currency(payment.amount_due)}</span>
          <span className="text-sm text-gray-500">due {fmt(payment.due_date)}</span>
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
          {daysOverdue !== null && daysOverdue > 0 && (
            <span className="text-xs font-bold text-red-600">{daysOverdue}d overdue</span>
          )}
        </div>
        {payment.paid_at && (
          <p className="text-xs text-gray-400 mt-0.5">Paid {fmt(payment.paid_at)}</p>
        )}
      </div>
      {payment.status !== 'paid' && (
        <button
          onClick={handleMarkPaid}
          disabled={pending}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          Mark Paid
        </button>
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
  const [changingStatus, startStatusChange] = useTransition()

  const scfg = bondStatusConfig[bond.status]
  const sortedCourtDates = [...bond.court_dates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const sortedPayments = [...bond.payments].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as BondStatus
    if (!confirm(`Change bond status to "${newStatus}"?`)) return
    startStatusChange(async () => {
      await updateBondStatus(bond.id, newStatus, defendantId)
    })
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
              {[bond.charge, bond.county ? `${bond.county} County` : null, bond.court]
                .filter(Boolean).join(' · ')}
            </p>
            {bond.case_number && (
              <p className="text-sm text-gray-400 mt-0.5">Case #{bond.case_number}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Premium summary */}
            <div className="text-right text-sm">
              <p className="text-gray-500">Premium owed</p>
              <p className="font-semibold text-gray-900">{currency(bond.premium_owed)}</p>
              {premiumRemaining > 0 && (
                <p className="text-red-600 font-medium">{currency(premiumRemaining)} remaining</p>
              )}
            </div>
            {/* Status selector */}
            <select
              value={bond.status}
              onChange={handleStatusChange}
              disabled={changingStatus}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] bg-white"
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
              Forfeiture deadline: {fmt(bond.forfeiture_deadline)}
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
              className="flex items-center gap-1.5 text-sm font-medium text-[#0f1e3c] hover:underline"
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
                  {cs.phone && <span className="text-gray-600">{cs.phone}</span>}
                  {cs.address && <span className="text-gray-400 text-sm">{cs.address}</span>}
                  {cs.assets_description && (
                    <span className="text-gray-500 text-sm italic">Assets: {cs.assets_description}</span>
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
