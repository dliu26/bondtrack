/**
 * Step 9 — Payment Tracker
 *
 * Runs daily at 8 AM via Vercel Cron.
 *
 *   1. Upcoming payments due in exactly 3 days
 *      → Bondsman notification.
 *
 *   2. Payments where due_date has passed and status is still 'upcoming'
 *      → Mark as 'overdue' + create bondsman notification.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronRequest, unauthorizedResponse, logCron } from '@/lib/cron'
import { format, addDays, differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return unauthorizedResponse()

  try {
  const supabase = await createServiceClient()
  const now = new Date()

  // ── 1. 3-day reminders ────────────────────────────────────────────────────
  const in3Start = startOfDay(addDays(now, 3)).toISOString().split('T')[0]
  const in3End   = endOfDay(addDays(now, 3)).toISOString().split('T')[0]

  const { data: upcoming } = await supabase
    .from('payments')
    .select(`
      id, amount_due, due_date,
      bonds!inner(
        id, bondsman_id,
        defendants!inner(first_name, last_name)
      )
    `)
    .eq('status', 'upcoming')
    .gte('due_date', in3Start)
    .lte('due_date', in3End)

  let remindersSent = 0

  for (const payment of upcoming ?? []) {
    const bondRaw = Array.isArray(payment.bonds) ? payment.bonds[0] : payment.bonds
    const bond = bondRaw as unknown as {
      id: string
      bondsman_id: string
      defendants: { first_name: string; last_name: string } | Array<{ first_name: string; last_name: string }>
    }
    if (!bond) continue
    const defRaw = Array.isArray(bond.defendants) ? bond.defendants[0] : bond.defendants
    const def = defRaw as { first_name: string; last_name: string } | null
    if (!def) continue
    const defName = `${def.first_name} ${def.last_name}`
    const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.amount_due)

    await supabase.from('notifications').insert({
      bondsman_id: bond.bondsman_id,
      bond_id: bond.id,
      message: `${defName} has a payment of ${amountStr} due in 3 days`,
      type: 'payment_overdue',
    })
    remindersSent++
  }

  // ── 2. Mark overdue ────────────────────────────────────────────────────────
  const todayStr = format(now, 'yyyy-MM-dd')

  const { data: pastDue } = await supabase
    .from('payments')
    .select(`
      id, amount_due, due_date,
      bonds!inner(id, bondsman_id, defendants!inner(first_name, last_name))
    `)
    .eq('status', 'upcoming')
    .lt('due_date', todayStr)

  let markedOverdue = 0

  for (const payment of pastDue ?? []) {
    await supabase
      .from('payments')
      .update({ status: 'overdue' })
      .eq('id', payment.id)

    const bondRaw2 = Array.isArray(payment.bonds) ? payment.bonds[0] : payment.bonds
    const bond = bondRaw2 as unknown as {
      id: string
      bondsman_id: string
      defendants: { first_name: string; last_name: string } | Array<{ first_name: string; last_name: string }>
    }
    if (!bond) continue
    const defRaw2 = Array.isArray(bond.defendants) ? bond.defendants[0] : bond.defendants
    const def2 = defRaw2 as { first_name: string; last_name: string } | null
    if (!def2) continue
    const defName = `${def2.first_name} ${def2.last_name}`
    const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.amount_due)
    const daysOverdue = differenceInCalendarDays(now, new Date(payment.due_date))

    await supabase.from('notifications').insert({
      bondsman_id: bond.bondsman_id,
      bond_id: bond.id,
      message: `${defName} co-signer payment of ${amountStr} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
      type: 'payment_overdue',
    })

    markedOverdue++
  }

    const msg = `${remindersSent} 3-day reminders, ${markedOverdue} marked overdue`
    console.log(`[PAYMENTS] ${msg}`)
    await logCron('payments', 'success', msg, remindersSent + markedOverdue)

    return Response.json({ ok: true, remindersSent, markedOverdue })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PAYMENTS] Fatal error:', message)
    await logCron('payments', 'failed', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
