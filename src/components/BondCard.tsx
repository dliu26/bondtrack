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
    labelColor: 'text-red-600 bg-red-50',
  },
  yellow: {
    border: 'border-l-amber-400',
    dot: 'bg-amber-400',
    label: 'Follow Up',
    labelColor: 'text-amber-700 bg-amber-50',
  },
  green: {
    border: 'border-l-green-500',
    dot: 'bg-green-500',
    label: 'On Track',
    labelColor: 'text-green-700 bg-green-50',
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
          'bg-white rounded-xl border border-gray-200 border-l-4 overflow-hidden',
          'shadow-sm hover:shadow-md transition-shadow duration-200',
          cfg.border
        )}
      >
        {/* ── Card header ───────────────────────────────────────────── */}
        <div className="px-5 py-4 flex items-center gap-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {bond.defendant.firstName} {bond.defendant.lastName}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
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
            <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
              {formatCurrency(bond.bondAmount)}
            </span>
          </div>
        </div>

        {/* ── 2×2 info grid (stacks to 1-col on mobile) ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Court Date */}
          <div className="px-5 py-3.5 border-b md:border-r border-gray-100">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Court Date
            </p>
            {bond.nextCourtDate ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(bond.nextCourtDate.date)}
                  {formatTime(bond.nextCourtDate.time)}
                </span>
                {bond.daysToCourtDate !== null && (
                  <span
                    className={clsx(
                      'text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                      bond.daysToCourtDate <= 3
                        ? 'bg-red-100 text-red-700'
                        : bond.daysToCourtDate <= 14
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
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
              <span className="text-sm text-gray-400">None scheduled</span>
            )}
          </div>

          {/* Check-in */}
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {bond.consecutiveMissedCheckins >= 1 ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              Check-in
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                {bond.defendant.lastCheckinAt
                  ? formatDate(bond.defendant.lastCheckinAt)
                  : 'Never'}
              </span>
              {bond.consecutiveMissedCheckins > 0 && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {bond.consecutiveMissedCheckins} missed
                </span>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="px-5 py-3.5 border-r border-gray-100">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              Payment
            </p>
            {bond.payment ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(bond.payment.amountDue)} due {formatDate(bond.payment.dueDate)}
                </span>
                {bond.payment.status === 'overdue' && bond.payment.daysOverdue !== null && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {bond.payment.daysOverdue}d overdue
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-400">None scheduled</span>
            )}
          </div>

          {/* Forfeiture */}
          <div className="px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
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
                    ? 'bg-red-100 text-red-700'
                    : bond.daysToForfeiture <= 30
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {bond.daysToForfeiture <= 0
                  ? 'DEADLINE PASSED'
                  : `${bond.daysToForfeiture}d remaining`}
              </span>
            ) : (
              <span className="text-sm text-gray-400">No deadline set</span>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          {bond.caseNumber ? (
            <span className="text-xs text-gray-400">
              Case #{sanitizeText(bond.caseNumber)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f1e3c] bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm group-hover:bg-[#0f1e3c] group-hover:text-white group-hover:border-[#0f1e3c] transition-colors">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
