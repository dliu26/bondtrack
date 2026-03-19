/**
 * SMS utility — stubs to console.log until Twilio is wired in.
 *
 * TO ACTIVATE REAL SMS:
 *   1. npm install twilio
 *   2. Set real values for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   3. Replace the stub body below with the commented-out Twilio block.
 */

function isStubMode() {
  return (
    !process.env.TWILIO_ACCOUNT_SID ||
    process.env.TWILIO_ACCOUNT_SID === 'stub'
  )
}

export async function sendSMS(to: string, body: string): Promise<void> {
  if (!to) return

  if (isStubMode()) {
    console.log(`[SMS STUB] → ${to}\n${body}\n`)
    return
  }

  /*
   * Uncomment when twilio is installed:
   *
   * const { default: Twilio } = await import('twilio')
   * const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
   * await client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER!, to })
   */
  console.warn('[SMS] Twilio not installed — falling back to stub. Run: npm install twilio')
  console.log(`[SMS STUB] → ${to}\n${body}\n`)
}

/** Normalize a phone string to E.164 (+1XXXXXXXXXX) for matching. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}
