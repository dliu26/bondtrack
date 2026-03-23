import Link from 'next/link'
import { Calendar, CheckCircle2, AlertCircle, CreditCard, ChevronRight, Clock } from 'lucide-react'
import clsx from 'clsx'
import { formatDate } from '@/lib/date'
import type { ProcessedBond } from '@/types/database'

const urgencyConfig = {
  red: {
    border: 'border-l-red-500',
    dot: 'bg-red-500',
    label: 'Needs Attention',
    labelColor: 'text-red-600 bg-red-50',
  },
  yellow: {
    border: 'border-l-yellow-400',
    dot: 'bg-yellow-400',
    label: 'Follow Up',
    labelColor: 'text-yellow-700 bg-yellow-50',
  },
  green: {
    border: 'border-l-green-500',
    dot: 'bg-green-500',
    label: 'On Track',
    labelColor: 'text-green-700 bg-green-50',
  },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return ''
  // timeStr is HH:MM:SS from Postgres time type
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return ` at ${hour12}:${m} ${ampm}`
}

export default function BondCard({ bond }: { bond: ProcessedBond }) {
  const cfg = urgencyConfig[bond.urgency]

  return (
    <Link href={`/defendants/${bond.defendant.id}`} className="block group">
      <div
        className={clsx(
          'bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 p-6',
          'hover:shadow-md transition-shadow',
          cfg.border
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {bond.defendant.firstName} {bond.defendant.lastName}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {bond.charge ?? 'No charge listed'}
              {bond.county ? ` · ${bond.county} County` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', cfg.labelColor)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(bond.bondAmount)}</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          {/* Court Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Court Date</p>
              {bond.nextCourtDate ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base text-gray-900">
                    {formatDate(bond.nextCourtDate.date)}
                    {formatTime(bond.nextCourtDate.time)}
                  </span>
                  {bond.daysToCourtDate !== null && (
                    <span
                      className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        bond.daysToCourtDate <= 3
                          ? 'bg-red-100 text-red-700'
                          : bond.daysToCourtDate <= 14
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {bond.daysToCourtDate === 0
                        ? 'TODAY'
                        : bond.daysToCourtDate === 1
                        ? 'Tomorrow'
                        : bond.daysToCourtDate < 0
                        ? `${Math.abs(bond.daysToCourtDate)}d ago`
                        : `In ${bond.daysToCourtDate} days`}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-base text-gray-400">None scheduled</span>
              )}
            </div>
          </div>

          {/* Check-in */}
          <div className="flex items-start gap-3">
            {bond.consecutiveMissedCheckins >= 1 ? (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">Last Check-in</p>
              <span className="text-base text-gray-900">
                {bond.defendant.lastCheckinAt
                  ? formatDate(bond.defendant.lastCheckinAt)
                  : 'Never'}
              </span>
              {bond.consecutiveMissedCheckins > 0 && (
                <span className="ml-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {bond.consecutiveMissedCheckins} missed
                </span>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Payment</p>
              {bond.payment ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base text-gray-900">
                    {formatCurrency(bond.payment.amountDue)} due {formatDate(bond.payment.dueDate)}
                  </span>
                  {bond.payment.status === 'overdue' && bond.payment.daysOverdue !== null && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {bond.payment.daysOverdue}d overdue
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-base text-gray-400">No payments scheduled</span>
              )}
            </div>
          </div>

          {/* Forfeiture countdown */}
          {bond.forfeitureDeadline && bond.daysToForfeiture !== null && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Forfeiture Deadline</p>
                <span className="text-base font-bold text-red-700">
                  {bond.daysToForfeiture <= 0
                    ? 'DEADLINE PASSED'
                    : `${bond.daysToForfeiture} days remaining`}
                  {' '}&mdash; {formatDate(bond.forfeitureDeadline)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          {bond.caseNumber && (
            <span className="text-xs text-gray-400">Case #{bond.caseNumber}</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-sm font-medium text-[#0f1e3c] group-hover:underline">
            View Details <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}
