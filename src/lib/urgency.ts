import { differenceInDays } from 'date-fns'
import { startOfDayCT } from '@/lib/date'
import type { Checkin, UrgencyLevel } from '@/types/database'

export function getDaysToDate(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return differenceInDays(new Date(y, m - 1, d), startOfDayCT())
}

export function getDaysOverdue(dueDateIso: string): number {
  const [y, m, d] = dueDateIso.split('-').map(Number)
  return differenceInDays(startOfDayCT(), new Date(y, m - 1, d))
}

export function getConsecutiveMissedCheckins(checkins: Checkin[]): number {
  // Sort most-recent first, skip pending (still waiting for response)
  const resolved = [...checkins]
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    .filter((c) => c.status !== 'pending')

  let count = 0
  for (const c of resolved) {
    if (c.status === 'missed') {
      count++
    } else {
      break // confirmed check-in ends the streak
    }
  }
  return count
}

interface UrgencyInput {
  daysToCourtDate: number | null
  consecutiveMissedCheckins: number
  daysPaymentOverdue: number | null
  daysToForfeiture: number | null
}

export function calculateUrgency({
  daysToCourtDate,
  consecutiveMissedCheckins,
  daysPaymentOverdue,
  daysToForfeiture,
}: UrgencyInput): UrgencyLevel {
  // RED conditions
  if (daysToCourtDate !== null && daysToCourtDate <= 3) return 'red'
  if (consecutiveMissedCheckins >= 2) return 'red'
  if (daysPaymentOverdue !== null && daysPaymentOverdue >= 14) return 'red'
  if (daysToForfeiture !== null && daysToForfeiture <= 30) return 'red'

  // YELLOW conditions
  if (daysToCourtDate !== null && daysToCourtDate <= 14) return 'yellow'
  if (consecutiveMissedCheckins === 1) return 'yellow'
  if (daysPaymentOverdue !== null && daysPaymentOverdue >= 1) return 'yellow'

  return 'green'
}
