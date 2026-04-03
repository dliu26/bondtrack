import { formatTimestamp } from '@/lib/date'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { Checkin } from '@/types/database'

const statusConfig = {
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-400' },
  missed:    { label: 'Missed',    icon: XCircle,      color: 'text-red-400' },
  pending:   { label: 'Pending',   icon: Clock,        color: 'text-slate-400' },
}

export default function CheckinTable({ checkins }: { checkins: Checkin[] }) {
  return (
    <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Check-in History</h2>

      {checkins.length === 0 ? (
        <p className="text-slate-400 text-base py-4">No check-ins on record yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="text-left text-sm text-slate-400 border-b border-white/10">
                <th className="pb-2 font-medium pr-6">Scheduled</th>
                <th className="pb-2 font-medium pr-6">Status</th>
                <th className="pb-2 font-medium pr-6">Response</th>
                <th className="pb-2 font-medium">Confirmed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {checkins.map((c) => {
                const cfg = statusConfig[c.status]
                const Icon = cfg.icon
                return (
                  <tr key={c.id} className={clsx(c.status === 'missed' && 'bg-red-900/10')}>
                    <td className="py-3 pr-6 text-white">{formatTimestamp(c.scheduled_at)}</td>
                    <td className="py-3 pr-6">
                      <span className={clsx('flex items-center gap-1.5 font-medium', cfg.color)}>
                        <Icon className="w-4 h-4 shrink-0" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-slate-300">{c.response ?? '—'}</td>
                    <td className="py-3 text-slate-400">
                      {c.responded_at ? formatTimestamp(c.responded_at) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
