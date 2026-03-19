/**
 * Step 10 — Forfeiture Manager
 *
 * Runs daily at 8 AM via Vercel Cron.
 *
 * For every active bond with a forfeiture_deadline set:
 *   — At 30, 14, and 7 days remaining: SMS alert to bondsman + notification.
 *   — Avoids duplicate alerts by checking whether a forfeiture_warning
 *     notification for this bond was already created today.
 *
 * The forfeiture_deadline is set automatically when a court date is
 * marked as missed (see defendants/[id]/actions.ts → updateCourtDateStatus).
 *
 * BONDSMAN_PHONE env var: set this to your phone number to receive SMS alerts.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { verifyCronRequest, unauthorizedResponse, logCron } from '@/lib/cron'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

const ALERT_DAYS = [30, 14, 7]

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return unauthorizedResponse()

  try {
  const supabase = await createServiceClient()
  const now = new Date()
  const bondsmanPhone = process.env.BONDSMAN_PHONE

  // Build the set of deadline dates we alert on today
  const alertDates = ALERT_DAYS.map((d) => format(addDays(now, d), 'yyyy-MM-dd'))

  const { data: bonds } = await supabase
    .from('bonds')
    .select('id, bondsman_id, forfeiture_deadline, defendants(first_name, last_name)')
    .eq('status', 'active')
    .in('forfeiture_deadline', alertDates)

  let alertsSent = 0

  for (const bond of bonds ?? []) {
    // Avoid duplicate alerts: skip if a forfeiture_warning was already sent today
    const todayStart = startOfDay(now).toISOString()
    const todayEnd   = endOfDay(now).toISOString()

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('bond_id', bond.id)
      .eq('type', 'forfeiture_warning')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    if ((count ?? 0) > 0) continue // already alerted today

    const defRaw = Array.isArray(bond.defendants) ? bond.defendants[0] : bond.defendants
    const defendant = defRaw as { first_name: string; last_name: string } | null
    const defName = defendant ? `${defendant.first_name} ${defendant.last_name}` : 'Unknown Defendant'
    const deadline = format(new Date(bond.forfeiture_deadline!), 'MMMM d, yyyy')

    // Calculate exact days remaining
    const daysLeft = alertDates.indexOf(bond.forfeiture_deadline!)
    const daysRemaining = ALERT_DAYS[daysLeft]

    const message = `URGENT: Forfeiture deadline for ${defName} is in ${daysRemaining} days (${deadline}). Immediate action required to avoid bond forfeiture.`

    await supabase.from('notifications').insert({
      bondsman_id: bond.bondsman_id,
      bond_id: bond.id,
      message,
      type: 'forfeiture_warning',
    })

    if (bondsmanPhone) {
      await sendSMS(bondsmanPhone, `[BondTrack] ${message}`)
    } else {
      console.warn('[FORFEITURE] BONDSMAN_PHONE not set — SMS not sent. Set it in env vars.')
      console.log(`[FORFEITURE ALERT] ${message}`)
    }

    alertsSent++
  }

    console.log(`[FORFEITURE] ${alertsSent} forfeiture alerts sent`)
    await logCron('forfeiture', 'success', `${alertsSent} forfeiture alerts sent`, alertsSent)

    return Response.json({ ok: true, alertsSent })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[FORFEITURE] Fatal error:', message)
    await logCron('forfeiture', 'failed', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
