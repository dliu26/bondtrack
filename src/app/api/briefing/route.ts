import { createClient } from '@/lib/supabase/server'
import { format, differenceInDays, parseISO } from 'date-fns'
import { getConsecutiveMissedCheckins, getDaysToDate, getDaysOverdue } from '@/lib/urgency'
import type { Checkin } from '@/types/database'

export async function POST(_request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const today = format(new Date(), 'yyyy-MM-dd')

  // Return cached briefing if already generated today
  const { data: cached } = await supabase
    .from('briefings')
    .select('content')
    .eq('bondsman_id', user.id)
    .eq('date', today)
    .single()

  if (cached) return Response.json({ bullets: JSON.parse(cached.content) })

  // ── Fetch portfolio data ──────────────────────────────────────────────────

  const { data: bondsRaw } = await supabase
    .from('bonds')
    .select('id, defendant_id, forfeiture_deadline, defendants(first_name, last_name)')
    .eq('bondsman_id', user.id)
    .eq('status', 'active')

  const bonds = bondsRaw ?? []
  const bondIds = bonds.map((b) => b.id)
  const defendantIds = bonds.map((b) => b.defendant_id)

  const [courtDatesRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from('court_dates')
      .select('bond_id, date, location')
      .in('bond_id', bondIds)
      .eq('status', 'upcoming')
      .order('date', { ascending: true }),
    supabase
      .from('payments')
      .select('bond_id, amount_due, due_date, status')
      .in('bond_id', bondIds)
      .in('status', ['upcoming', 'overdue'])
      .order('due_date', { ascending: true }),
    supabase
      .from('checkins')
      .select('defendant_id, scheduled_at, status, responded_at, response')
      .in('defendant_id', defendantIds)
      .order('scheduled_at', { ascending: false })
      .limit(300),
  ])

  const courtDates = courtDatesRes.data ?? []
  const payments = paymentsRes.data ?? []
  const checkins = checkinsRes.data ?? []

  // Group data
  const nextCourtByBond = new Map<string, { date: string; location: string | null }>()
  for (const cd of courtDates) {
    if (!nextCourtByBond.has(cd.bond_id)) nextCourtByBond.set(cd.bond_id, cd)
  }

  const overduePaymentByBond = new Map<string, { amount_due: number; due_date: string }>()
  for (const p of payments) {
    if (p.status === 'overdue' && !overduePaymentByBond.has(p.bond_id)) {
      overduePaymentByBond.set(p.bond_id, p)
    }
  }

  const checkinsByDefendant = new Map<string, Checkin[]>()
  for (const c of checkins) {
    const arr = checkinsByDefendant.get(c.defendant_id) ?? []
    arr.push(c as Checkin)
    checkinsByDefendant.set(c.defendant_id, arr)
  }

  // ── Generate bullets ──────────────────────────────────────────────────────

  interface UrgentItem { priority: number; text: string }
  const urgentItems: UrgentItem[] = []

  for (const bond of bonds) {
    const defRaw = Array.isArray(bond.defendants) ? bond.defendants[0] : bond.defendants
    const def = defRaw as { first_name: string; last_name: string } | null
    if (!def) continue
    const name = `${def.first_name} ${def.last_name}`

    // Forfeiture ≤ 30 days (highest priority)
    if (bond.forfeiture_deadline) {
      const daysLeft = getDaysToDate(bond.forfeiture_deadline)
      if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
        urgentItems.push({
          priority: 1,
          text: `${name} forfeiture deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${format(parseISO(bond.forfeiture_deadline), 'MMM d')}) — take action immediately`,
        })
      }
    }

    // Court date ≤ 3 days
    const court = nextCourtByBond.get(bond.id)
    if (court) {
      const daysTo = getDaysToDate(court.date)
      if (daysTo !== null && daysTo <= 3 && daysTo >= 0) {
        const loc = court.location ? ` at ${court.location}` : ''
        const when = daysTo === 0 ? 'today' : daysTo === 1 ? 'tomorrow' : `in ${daysTo} days`
        urgentItems.push({
          priority: 2,
          text: `${name} has a court date ${when}${loc}`,
        })
      }
    }

    // 2+ consecutive missed check-ins
    const defCheckins = checkinsByDefendant.get(bond.defendant_id) ?? []
    const missedCount = getConsecutiveMissedCheckins(defCheckins)
    if (missedCount >= 2) {
      const lastMissed = defCheckins.find((c) => c.status === 'missed')
      const daysSince = lastMissed
        ? differenceInDays(new Date(), new Date(lastMissed.scheduled_at))
        : null
      urgentItems.push({
        priority: 3,
        text: `${name} has not checked in for ${daysSince ?? missedCount} day${(daysSince ?? missedCount) === 1 ? '' : 's'} (${missedCount} consecutive missed check-ins)`,
      })
    }

    // Payment overdue ≥ 14 days
    const overdue = overduePaymentByBond.get(bond.id)
    if (overdue) {
      const daysOverdue = getDaysOverdue(overdue.due_date)
      if (daysOverdue !== null && daysOverdue >= 14) {
        const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(overdue.amount_due)
        urgentItems.push({
          priority: 4,
          text: `${name}'s co-signer payment of ${amount} is ${daysOverdue} days overdue`,
        })
      }
    }
  }

  urgentItems.sort((a, b) => a.priority - b.priority)

  const bullets: string[] = []
  bullets.push(`Good morning. You have ${bonds.length} active bond${bonds.length === 1 ? '' : 's'}.`)

  if (urgentItems.length === 0) {
    bullets.push('All bonds are on track. No immediate action required.')
  } else {
    for (const item of urgentItems) {
      bullets.push(item.text)
    }
  }

  // Cache and return
  await supabase.from('briefings').upsert(
    { bondsman_id: user.id, date: today, content: JSON.stringify(bullets) },
    { onConflict: 'bondsman_id,date' }
  )

  return Response.json({ bullets })
}
