import { format, parseISO } from 'date-fns'
import { Phone, PhoneOff, PhoneCall } from 'lucide-react'
import clsx from 'clsx'
import type { CallLog } from '@/types/database'

const outcomeConfig: Record<CallLog['outcome'], { label: string; Icon: React.ElementType; color: string }> = {
  reached:   { label: 'Reached',       Icon: Phone,     color: 'text-green-600' },
  no_answer: { label: 'No answer',     Icon: PhoneOff,  color: 'text-gray-400'  },
  voicemail: { label: 'Left voicemail',Icon: PhoneCall, color: 'text-blue-500'  },
}

export default function CallLogTable({ callLogs }: { callLogs: CallLog[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Phone className="w-4 h-4" />
        Call Log
      </h2>

      {callLogs.length === 0 ? (
        <p className="text-gray-400 text-base py-2">
          No calls logged yet. Tap any phone number to call and log the outcome.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {callLogs.map((log) => {
            const cfg = outcomeConfig[log.outcome]
            const Icon = cfg.Icon
            return (
              <div key={log.id} className="flex items-center gap-4 py-3.5">
                <div className={clsx('w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0', cfg.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-gray-800 truncate">{log.called_name}</p>
                  <p className="text-sm text-gray-500">{log.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={clsx('text-sm font-semibold', cfg.color)}>{cfg.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(parseISO(log.created_at), 'MMM d · h:mm a')}
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
