/**
 * Step 7 — Court Date Monitoring
 *
 * Runs daily at 7 AM via Vercel Cron.
 * For every active Collin County bond with a case number:
 *   1. Scrapes the public case portal for current hearing dates.
 *   2. Compares against stored court_dates — new or changed dates trigger a
 *      notification + SMS to the bondsman.
 *   3. Sends 14-day and 3-day reminder SMS to the defendant.
 *
 * COURT PORTAL SETUP:
 *   Set COLLIN_COUNTY_COURT_URL in your environment to the public case search
 *   URL for Collin County TX. Verify the URL and update parseDatesFromHtml()
 *   once you have confirmed the portal's HTML structure.
 *   Common Collin County portals to check:
 *     - https://portal.co.collin.tx.us/PublicAccess/
 *     - https://collin.tx.publicsearch.us/
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { verifyCronRequest, unauthorizedResponse, logCron } from '@/lib/cron'
import { format, addDays, parseISO, differenceInDays } from 'date-fns'
import { parse as parseHtml } from 'node-html-parser'

// ── HTML parser ───────────────────────────────────────────────────────────────
// Update this function once you have inspected the portal's actual HTML.
// It should return ISO dates (YYYY-MM-DD) found in the case hearing table.
function parseDatesFromHtml(
  html: string
): Array<{ date: string; time: string | null; location: string | null }> {
  const root = parseHtml(html)
  const results: Array<{ date: string; time: string | null; location: string | null }> = []

  // Strategy: look for MM/DD/YYYY date patterns inside table cells.
  // TODO: tighten this selector once you've inspected real portal HTML.
  //       For example: root.querySelectorAll('.HearingDate td') or similar.
  const dateRe = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g
  const timeRe = /(\d{1,2}:\d{2}\s*[AP]M)/i
  const fullText = root.text

  let match: RegExpExecArray | null
  while ((match = dateRe.exec(fullText)) !== null) {
    const [, month, day, year] = match
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    // Only future or near-future dates; skip old ones
    if (differenceInDays(parseISO(iso), new Date()) < -1) continue
    if (!results.find((r) => r.date === iso)) {
      const timeMatch = timeRe.exec(fullText)
      results.push({
        date: iso,
        time: timeMatch ? timeMatch[1] : null,
        location: null, // TODO: extract from portal HTML
      })
    }
  }

  return results
}

async function scrapeCase(
  caseNumber: string
): Promise<Array<{ date: string; time: string | null; location: string | null }>> {
  const baseUrl = process.env.COLLIN_COUNTY_COURT_URL
  if (!baseUrl) {
    console.warn('[COURT-SCRAPER] COLLIN_COUNTY_COURT_URL not set — skipping')
    return []
  }

  try {
    // Try as a query-param GET first; many Odyssey portals accept this.
    const url = `${baseUrl}?caseNumber=${encodeURIComponent(caseNumber)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BondTrack-Monitor/1.0' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      console.warn(`[COURT-SCRAPER] HTTP ${res.status} for case ${caseNumber}`)
      return []
    }
    const html = await res.text()
    return parseDatesFromHtml(html)
  } catch (err) {
    console.error(`[COURT-SCRAPER] Error scraping case ${caseNumber}:`, err)
    return []
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return unauthorizedResponse()

  try {
    const supabase = await createServiceClient()
    const today = new Date()
    const in14 = format(addDays(today, 14), 'yyyy-MM-dd')
    const in3  = format(addDays(today, 3),  'yyyy-MM-dd')

    // ── 1. Court date reminders (14-day + 3-day) ─────────────────────────────
    const { data: reminderDates } = await supabase
      .from('court_dates')
      .select('*, bonds!inner(defendant_id, defendants(first_name, phone))')
      .eq('status', 'upcoming')
      .in('date', [in14, in3])

    let reminders14 = 0, reminders3 = 0

    for (const cd of reminderDates ?? []) {
      const bond = cd.bonds as { defendant_id: string; defendants: { first_name: string; phone: string | null } | null }
      const defendant = bond?.defendants
      if (!defendant?.phone) continue

      const daysOut = cd.date === in14 ? 14 : 3
      const flag = daysOut === 14 ? 'reminder_sent_14d' : 'reminder_sent_3d'
      const alreadySent = daysOut === 14 ? cd.reminder_sent_14d : cd.reminder_sent_3d
      if (alreadySent) continue

      const dateStr = format(parseISO(cd.date), 'MMMM d, yyyy')
      const timeStr = cd.time ? ` at ${cd.time}` : ''
      const locStr  = cd.location ? ` at ${cd.location}` : ''

      await sendSMS(
        defendant.phone,
        `Reminder: You have a court date on ${dateStr}${timeStr}${locStr}. Reply CONFIRM to acknowledge.`
      )

      await supabase
        .from('court_dates')
        .update({ [flag]: true })
        .eq('id', cd.id)

      if (daysOut === 14) reminders14++; else reminders3++
    }

    // ── 2. Scrape Collin County portal for case changes ───────────────────────
    const { data: collinBonds } = await supabase
      .from('bonds')
      .select('id, case_number, bondsman_id, defendant_id, court_dates(*)')
      .eq('status', 'active')
      .ilike('county', '%collin%')
      .not('case_number', 'is', null)

    let changesDetected = 0

    for (const bond of collinBonds ?? []) {
      if (!bond.case_number) continue
      const scraped = await scrapeCase(bond.case_number)
      if (scraped.length === 0) continue

      const stored = (bond.court_dates ?? []) as Array<{ date: string; id: string }>
      const storedDates = new Set(stored.map((d) => d.date))

      for (const found of scraped) {
        if (storedDates.has(found.date)) continue

        await supabase.from('court_dates').insert({
          bond_id: bond.id,
          date: found.date,
          time: found.time,
          location: found.location,
          status: 'upcoming',
        })

        const message = `Court date change detected for case ${bond.case_number}: new hearing on ${format(parseISO(found.date), 'MMMM d, yyyy')}. Check the portal to confirm.`

        await supabase.from('notifications').insert({
          bondsman_id: bond.bondsman_id,
          bond_id: bond.id,
          message,
          type: 'court_change',
        })

        const bondsmanPhone = process.env.BONDSMAN_PHONE
        if (bondsmanPhone) await sendSMS(bondsmanPhone, `[BondTrack] ${message}`)

        changesDetected++
      }
    }

    const total = reminders14 + reminders3 + changesDetected
    const msg = `${reminders14} 14d reminders, ${reminders3} 3d reminders, ${changesDetected} changes`
    console.log(`[COURT-CHECK] Done — ${msg}`)
    await logCron('court_check', 'success', msg, total)

    return Response.json({ ok: true, reminders14, reminders3, changesDetected })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[COURT-CHECK] Fatal error:', message)
    await logCron('court_check', 'failed', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
