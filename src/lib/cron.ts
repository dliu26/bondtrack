import { createServiceClient } from '@/lib/supabase/server'

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every invocation.
 * If CRON_SECRET is not set we allow the request (dev/local convenience).
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Insert a row into cron_logs. Swallows errors so a logging failure never kills the cron job. */
export async function logCron(
  jobName: string,
  status: 'success' | 'failed',
  message: string,
  recordsProcessed = 0
): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from('cron_logs').insert({ job_name: jobName, status, message, records_processed: recordsProcessed })
  } catch (err) {
    console.error('[CRON-LOG] Failed to write log:', err)
  }
}
