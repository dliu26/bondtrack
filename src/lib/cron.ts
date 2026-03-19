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
