/**
 * Step 8 — Inbound SMS Webhook
 *
 * Twilio calls this endpoint when a defendant replies to a check-in or
 * court-date reminder SMS. Configure your Twilio number's Messaging webhook
 * to POST to: https://your-domain.com/api/sms/inbound
 *
 * Handles:
 *   YES / Y          → confirm a pending check-in
 *   CONFIRM          → acknowledge a court-date reminder
 */

import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/sms'

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const body = (formData.get('Body') as string | null)?.trim().toUpperCase() ?? ''
  const from = (formData.get('From') as string | null) ?? ''

  if (!from) return twiml('Unable to process your message.')

  const normalizedFrom = normalizePhone(from)
  const supabase = await createServiceClient()

  // ── Find defendant by phone ─────────────────────────────────────────────
  const { data: defendants } = await supabase
    .from('defendants')
    .select('id, first_name, phone')
    .not('phone', 'is', null)

  const defendant = (defendants ?? []).find(
    (d) => d.phone && normalizePhone(d.phone) === normalizedFrom
  )

  if (!defendant) {
    console.warn(`[SMS-INBOUND] Unknown sender: ${from}`)
    return twiml('We could not find your record. Please contact your bondsman.')
  }

  // ── Handle CHECK-IN confirmation (YES / Y) ──────────────────────────────
  if (body === 'YES' || body === 'Y') {
    const { data: pending } = await supabase
      .from('checkins')
      .select('id')
      .eq('defendant_id', defendant.id)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single()

    if (!pending) {
      return twiml('No pending check-in found. Thank you for reaching out.')
    }

    await supabase
      .from('checkins')
      .update({
        status: 'confirmed',
        responded_at: new Date().toISOString(),
        response: 'YES',
      })
      .eq('id', pending.id)

    await supabase
      .from('defendants')
      .update({ last_checkin_at: new Date().toISOString() })
      .eq('id', defendant.id)

    console.log(`[SMS-INBOUND] Check-in confirmed for ${defendant.first_name} (${from})`)
    return twiml(`Thank you, ${defendant.first_name}! Your check-in is confirmed.`)
  }

  // ── Handle COURT DATE confirmation (CONFIRM) ────────────────────────────
  if (body === 'CONFIRM') {
    console.log(`[SMS-INBOUND] Court date acknowledged by ${defendant.first_name} (${from})`)
    return twiml(`Thank you, ${defendant.first_name}. Your court date confirmation has been recorded.`)
  }

  // ── Unknown reply ───────────────────────────────────────────────────────
  return twiml(`Reply YES to confirm your check-in or CONFIRM to acknowledge your court date.`)
}
