import { formatTimestamp } from '@/lib/date'
import { Phone, PhoneOff, PhoneCall } from 'lucide-react'
import clsx from 'clsx'
import type { CallLog } from '@/types/database'

const outcomeConfig: Record<CallLog['outcome'], { label: string; Icon: React.ElementType; color: string }> = {
  reached:   { label: 'Reached',        Icon: Phone,     color: 'text-green-400' },
  no_answer: { label: 'No answer',      Icon: PhoneOff,  color: 'text-slate-400' },
  voicemail: { label: 'Left voicemail', Icon: PhoneCall, color: 'text-blue-400'  },
}

export default function CallLogTable({ callLogs }: { callLogs: CallLog[] }) {
  return (
    <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Phone className="w-4 h-4" />
        Call Log
      </h2>

      {callLogs.length === 0 ? (
        <p className="text-slate-400 text-base py-2">
          No calls logged yet. Tap any phone number to call and log the outcome.
        </p>
      ) : (
        <div className="divide-y divide-white/10">
          {callLogs.map((log) => {
            const cfg = outcomeConfig[log.outcome]
            const Icon = cfg.Icon
            return (
              <div key={log.id} className="flex items-center gap-4 py-3.5">
                <div className={clsx('w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0', cfg.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-white truncate">{log.called_name}</p>
                  <p className="text-sm text-slate-400">{log.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={clsx('text-sm font-semibold', cfg.color)}>{cfg.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatTimestamp(log.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
