import { createServiceClient } from '@/lib/supabase/server'

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every invocation.
 * In production CRON_SECRET is required — missing secret = denied.
 * In local dev (NODE_ENV !== 'production') we allow through if unset as a convenience.
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true // local dev only
  }
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
