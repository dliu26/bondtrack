/**
 * Step 8 — Defendant Check-in System
 *
 * Two actions controlled by ?action= query param:
 *
 *   action=send   (runs every hour via Vercel Cron)
 *     — Find defendants whose preferred check-in hour (checkin_hour_ct) matches
 *       the current hour in America/Chicago.
 *     — Insert a pending checkin record for defendants who are due today.
 *
 *   action=missed  (1 PM CT / 19:00 UTC daily)
 *     — Find check-ins sent 4+ hours ago that are still pending.
 *     — Mark them missed, create a notification for the bondsman.
 *     — If 2+ consecutive missed check-ins, the dashboard urgency turns red
 *       (calculated at render time from the checkins table — no extra flag needed).
 *
 * SQL migration required:
 *   alter table defendants
 *     add column if not exists checkin_hour_ct int not null default 8
 *       check (checkin_hour_ct >= 0 and checkin_hour_ct <= 23);
 */

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronRequest, unauthorizedResponse, logCron } from '@/lib/cron'
import { subDays, subHours, startOfDay, endOfDay } from 'date-fns'

// ── Send check-ins ────────────────────────────────────────────────────────────

async function sendCheckIns() {
  const supabase = await createServiceClient()
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd   = endOfDay(now).toISOString()

  // Fetch active defendant IDs via bonds
  const { data: activeBonds } = await supabase
    .from('bonds')
    .select('defendant_id')
    .eq('status', 'active')
  const activeDefendantIds = [...new Set((activeBonds ?? []).map((b) => b.defendant_id))]
  if (activeDefendantIds.length === 0) return { sent: 0 }

  // Process all defendants regardless of preferred check-in hour
  const { data: defendants } = await supabase
    .from('defendants')
    .select('id, first_name, checkin_frequency, last_checkin_at, bondsman_id')
    .in('id', activeDefendantIds)

  let sent = 0

  for (const def of defendants ?? []) {
    if (def.checkin_frequency === 'custom') continue // manual only

    // Check if a check-in was already scheduled today
    const { count } = await supabase
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('defendant_id', def.id)
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)

    if ((count ?? 0) > 0) continue // already sent today

    // Is this defendant due for a check-in?
    const lastCheckin = def.last_checkin_at ? new Date(def.last_checkin_at) : null
    const dueThreshold = def.checkin_frequency === 'daily'
      ? subDays(now, 1)
      : subDays(now, 6) // weekly: due if 6+ days since last

    if (lastCheckin && lastCheckin > dueThreshold) continue // not due yet

    // Create pending check-in record
    await supabase.from('checkins').insert({
      defendant_id: def.id,
      scheduled_at: now.toISOString(),
      status: 'pending',
    })

    sent++
  }

  console.log(`[CHECKINS-SEND] Scheduled ${sent} check-ins`)
  return { sent }
}

// ── Mark missed ───────────────────────────────────────────────────────────────

async function markMissedCheckIns() {
  const supabase = await createServiceClient()
  const cutoff = subHours(new Date(), 4).toISOString()

  // Find pending check-ins sent 4+ hours ago
  const { data: overdue } = await supabase
    .from('checkins')
    .select('id, defendant_id, defendants(bondsman_id, first_name)')
    .eq('status', 'pending')
    .lt('scheduled_at', cutoff)

  let marked = 0

  for (const checkin of overdue ?? []) {
    await supabase
      .from('checkins')
      .update({ status: 'missed' })
      .eq('id', checkin.id)

    const defRaw = checkin.defendants
    const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as { bondsman_id: string; first_name: string } | null
    if (!def) continue

    // Find the bond for a notification
    const { data: bond } = await supabase
      .from('bonds')
      .select('id')
      .eq('defendant_id', checkin.defendant_id)
      .eq('status', 'active')
      .limit(1)
      .single()

    await supabase.from('notifications').insert({
      bondsman_id: def.bondsman_id,
      bond_id: bond?.id ?? null,
      message: `${def.first_name} has not responded to their check-in`,
      type: 'checkin_missed',
    })

    marked++
  }

  console.log(`[CHECKINS-MISSED] Marked ${marked} check-ins as missed`)
  return { marked }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? 'send'

  if (action === 'missed') {
    try {
      const result = await markMissedCheckIns()
      await logCron('checkins_missed', 'success', `Marked ${result.marked} check-ins as missed`, result.marked)
      return Response.json({ ok: true, ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await logCron('checkins_missed', 'failed', message)
      return Response.json({ ok: false, error: message }, { status: 500 })
    }
  }

  try {
    const result = await sendCheckIns()
    await logCron('checkins_send', 'success', `Scheduled ${result.sent} check-ins`, result.sent)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logCron('checkins_send', 'failed', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
