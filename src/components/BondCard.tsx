import Link from 'next/link'
import { Calendar, CheckCircle2, AlertCircle, CreditCard, ChevronRight, Clock } from 'lucide-react'
import clsx from 'clsx'
import { formatDate } from '@/lib/date'
import { sanitizeText } from '@/lib/sanitize'
import type { ProcessedBond } from '@/types/database'

const urgencyConfig = {
  red: {
    border: 'border-l-red-500',
    dot: 'bg-red-500',
    label: 'Needs Attention',
    labelColor: 'text-red-400 bg-red-900/30',
  },
  yellow: {
    border: 'border-l-amber-400',
    dot: 'bg-amber-400',
    label: 'Follow Up',
    labelColor: 'text-amber-300 bg-amber-900/30',
  },
  green: {
    border: 'border-l-green-500',
    dot: 'bg-green-500',
    label: 'On Track',
    labelColor: 'text-green-400 bg-green-900/30',
  },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return ` · ${hour12}:${m} ${ampm}`
}

export default function BondCard({ bond }: { bond: ProcessedBond }) {
  const cfg = urgencyConfig[bond.urgency]

  return (
    <Link href={`/defendants/${bond.defendant.id}`} className="block group">
      <div
        className={clsx(
          'bg-[#1a2d4f] rounded-xl border border-white/10 border-l-4 overflow-hidden',
          'shadow-lg hover:shadow-xl hover:bg-white/5 transition-all duration-200',
          cfg.border
        )}
      >
        {/* ── Card header ───────────────────────────────────────────── */}
        <div className="px-5 py-4 flex items-center gap-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">
              {bond.defendant.firstName} {bond.defendant.lastName}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 truncate">
              {sanitizeText(bond.charge) || 'No charge listed'}
              {bond.county ? ` · ${sanitizeText(bond.county)} County` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={clsx(
                'hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                cfg.labelColor
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
              {cfg.label}
            </span>
            <span className="text-xl font-bold text-white whitespace-nowrap">
              {formatCurrency(bond.bondAmount)}
            </span>
          </div>
        </div>

        {/* ── 2×2 info grid (stacks to 1-col on mobile) ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Court Date */}
          <div className="px-5 py-3.5 border-b md:border-r border-white/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Court Date
            </p>
            {bond.nextCourtDate ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">
                  {formatDate(bond.nextCourtDate.date)}
                  {formatTime(bond.nextCourtDate.time)}
                </span>
                {bond.daysToCourtDate !== null && (
                  <span
                    className={clsx(
                      'text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                      bond.daysToCourtDate <= 3
                        ? 'bg-red-900/40 text-red-400'
                        : bond.daysToCourtDate <= 14
                        ? 'bg-amber-900/40 text-amber-300'
                        : 'bg-white/10 text-slate-400'
                    )}
                  >
                    {bond.daysToCourtDate === 0
                      ? 'Today'
                      : bond.daysToCourtDate === 1
                      ? 'Tomorrow'
                      : bond.daysToCourtDate < 0
                      ? `${Math.abs(bond.daysToCourtDate)}d ago`
                      : `${bond.daysToCourtDate}d`}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">None scheduled</span>
            )}
          </div>

          {/* Check-in */}
          <div className="px-5 py-3.5 border-b border-white/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              {bond.consecutiveMissedCheckins >= 1 ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              Check-in
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">
                {bond.defendant.lastCheckinAt
                  ? formatDate(bond.defendant.lastCheckinAt)
                  : 'Never'}
              </span>
              {bond.consecutiveMissedCheckins > 0 && (
                <span className="text-xs font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {bond.consecutiveMissedCheckins} missed
                </span>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="px-5 py-3.5 border-r border-white/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              Payment
            </p>
            {bond.payment ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(bond.payment.amountDue)} due {formatDate(bond.payment.dueDate)}
                </span>
                {bond.payment.status === 'overdue' && bond.payment.daysOverdue !== null && (
                  <span className="text-xs font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {bond.payment.daysOverdue}d overdue
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">None scheduled</span>
            )}
          </div>

          {/* Forfeiture */}
          <div className="px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Forfeiture
            </p>
            {bond.forfeitureDeadline && bond.daysToForfeiture !== null ? (
              <span
                className={clsx(
                  'inline-flex items-center text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap',
                  bond.daysToForfeiture <= 0
                    ? 'bg-red-600 text-white'
                    : bond.daysToForfeiture <= 7
                    ? 'bg-red-900/40 text-red-400'
                    : bond.daysToForfeiture <= 30
                    ? 'bg-orange-900/40 text-orange-300'
                    : 'bg-white/10 text-slate-400'
                )}
              >
                {bond.daysToForfeiture <= 0
                  ? 'DEADLINE PASSED'
                  : `${bond.daysToForfeiture}d remaining`}
              </span>
            ) : (
              <span className="text-sm text-slate-500">No deadline set</span>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
          {bond.caseNumber ? (
            <span className="text-xs text-slate-500">
              Case #{sanitizeText(bond.caseNumber)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg group-hover:bg-white/20 group-hover:text-white transition-colors">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
