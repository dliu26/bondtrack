'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Calendar, AlertCircle, CreditCard, AlertTriangle, CheckCheck } from 'lucide-react'
import clsx from 'clsx'
import { markAsRead, markAllRead } from '../actions'
import { toast } from '@/lib/toast'
import type { NotificationType } from '@/types/database'

interface NotificationRow {
  id: string
  message: string
  type: NotificationType
  read: boolean
  created_at: string
  defendant_id: string | null
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; iconColor: string; iconBg: string; label: string }
> = {
  court_change:        { icon: Calendar,      iconColor: 'text-blue-600',   iconBg: 'bg-blue-100',   label: 'Court Change' },
  checkin_missed:      { icon: AlertCircle,   iconColor: 'text-orange-600', iconBg: 'bg-orange-100', label: 'Missed Check-in' },
  payment_overdue:     { icon: CreditCard,    iconColor: 'text-red-600',    iconBg: 'bg-red-100',    label: 'Payment Overdue' },
  forfeiture_warning:  { icon: AlertTriangle, iconColor: 'text-red-700',    iconBg: 'bg-red-100',    label: 'Forfeiture Warning' },
}

export default function NotificationsList({
  initialNotifications,
}: {
  initialNotifications: NotificationRow[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [busyAll, setBusyAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  function handleClick(n: NotificationRow) {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    markAsRead(n.id) // fire-and-forget; server revalidates layout badge
    if (n.defendant_id) router.push(`/defendants/${n.defendant_id}`)
  }

  async function handleMarkAll() {
    const prev = notifications
    setNotifications((p) => p.map((n) => ({ ...n, read: true })))
    setBusyAll(true)
    const result = await markAllRead()
    setBusyAll(false)
    if (result?.error) {
      setNotifications(prev)
      toast(result.error, 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-6 mb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={busyAll}
            className="flex items-center gap-2 text-sm md:text-base font-medium text-gray-600 border border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-95 duration-75 disabled:opacity-40 min-h-[44px] shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark All Read</span>
            <span className="sm:hidden">Mark All</span>
          </button>
        )}
      </div>
      <p className="text-sm text-gray-400 mt-3 mb-6">
        Notification delivery is not guaranteed. Always verify critical deadlines independently.
      </p>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <CheckCheck className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <p className="text-2xl font-bold text-gray-700">You're all caught up.</p>
          <p className="text-gray-400 mt-2 text-lg">No notifications right now. Check back after your next court date or check-in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type]
            const Icon = cfg.icon
            const timeAgo = formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })
            const isClickable = !!n.defendant_id

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={clsx(
                  'flex items-start gap-4 px-6 py-5 transition-colors',
                  !n.read && 'bg-blue-50/40',
                  isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                )}
              >
                {/* Icon */}
                <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                  <Icon className={clsx('w-5 h-5', cfg.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={clsx('text-xs font-bold uppercase tracking-wide', cfg.iconColor)}>
                      {cfg.label}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-base text-gray-800 leading-snug">{n.message}</p>
                  <p className="text-sm text-gray-400 mt-1">{timeAgo}</p>
                </div>

                {/* Arrow for clickable */}
                {isClickable && (
                  <span className="text-gray-300 text-xl shrink-0 self-center">›</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
