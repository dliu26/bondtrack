/**
 * /admin/health — Cron Job Health Dashboard
 *
 * Requires an authenticated session (redirects to /login otherwise).
 * Requires the cron_logs table (run the SQL in Supabase before deploying).
 */

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, formatDistanceToNow, addDays } from 'date-fns'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

// ── Job definitions ───────────────────────────────────────────────────────────

interface JobDef {
  key: string
  label: string
  schedule: string        // human-readable
  hourUTC: number         // hour the cron fires (UTC)
  maxHoursAgo: number     // alert if last run is older than this
}

const JOBS: JobDef[] = [
  { key: 'court_check',     label: 'Court Date Monitor',    schedule: '7:00 AM daily',  hourUTC: 7,  maxHoursAgo: 25 },
  { key: 'checkins_send',   label: 'Check-in Sender',       schedule: '9:00 AM daily',  hourUTC: 9,  maxHoursAgo: 25 },
  { key: 'checkins_missed', label: 'Missed Check-in Scan',  schedule: '1:00 PM daily',  hourUTC: 13, maxHoursAgo: 25 },
  { key: 'payments',        label: 'Payment Tracker',       schedule: '8:00 AM daily',  hourUTC: 8,  maxHoursAgo: 25 },
  { key: 'forfeiture',      label: 'Forfeiture Monitor',    schedule: '8:00 AM daily',  hourUTC: 8,  maxHoursAgo: 25 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextRunAfter(now: Date, hourUTC: number): Date {
  const candidate = new Date(now)
  candidate.setUTCHours(hourUTC, 0, 0, 0)
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1)
  return candidate
}

interface CronLog {
  id: string
  ran_at: string
  status: 'success' | 'failed'
  message: string | null
  records_processed: number | null
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function HealthPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceClient()
  const now = new Date()

  // Fetch last 10 runs for all jobs in one query
  const { data: logs, error } = await supabase
    .from('cron_logs')
    .select('id, job_name, ran_at, status, message, records_processed')
    .order('ran_at', { ascending: false })
    .limit(200)

  const tableExists = !error || !error.message.includes('does not exist')

  // Group by job_name
  const logsByJob = new Map<string, CronLog[]>()
  for (const log of logs ?? []) {
    const arr = logsByJob.get(log.job_name) ?? []
    arr.push(log as CronLog)
    logsByJob.set(log.job_name, arr)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cron Health</h1>
          <p className="text-gray-500 mt-1">
            Last refreshed: {format(now, 'MMM d, yyyy h:mm:ss a')}
            {' · '}
            <a href="/admin/health" className="text-blue-600 hover:underline">Refresh</a>
          </p>
        </div>

        {/* Table missing warning */}
        {!tableExists && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700">
            <p className="font-semibold">cron_logs table not found.</p>
            <p className="text-sm mt-1">Run the SQL below in your Supabase SQL editor to create it:</p>
            <pre className="mt-2 text-xs bg-red-100 rounded p-3 overflow-x-auto">{`create table cron_logs (
  id uuid primary key default uuid_generate_v4(),
  job_name text not null,
  ran_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failed')),
  message text,
  records_processed int default 0
);`}</pre>
          </div>
        )}

        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {JOBS.map((job) => {
            const runs = logsByJob.get(job.key) ?? []
            const last = runs[0] ?? null
            const nextRun = nextRunAfter(now, job.hourUTC)

            const hoursAgo = last
              ? (now.getTime() - new Date(last.ran_at).getTime()) / 3_600_000
              : Infinity

            const isHealthy = last?.status === 'success' && hoursAgo < job.maxHoursAgo
            const isWarn    = !last
            const isFail    = !isHealthy && !isWarn

            return (
              <div
                key={job.key}
                className={clsx(
                  'bg-white rounded-2xl border-l-4 shadow-sm p-5',
                  isHealthy ? 'border-l-green-500' : isFail ? 'border-l-red-500' : 'border-l-gray-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{job.label}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{job.schedule}</p>
                  </div>
                  <span className={clsx(
                    'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
                    isHealthy ? 'bg-green-100 text-green-700'
                      : isFail ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                  )}>
                    {isHealthy ? 'OK' : isFail ? 'FAIL' : 'NEVER RUN'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <Row label="Last run">
                    {last
                      ? `${formatDistanceToNow(new Date(last.ran_at))} ago`
                      : <span className="text-gray-400">—</span>}
                  </Row>
                  <Row label="Status">
                    {last
                      ? <span className={last.status === 'success' ? 'text-green-600' : 'text-red-600'}>{last.status}</span>
                      : <span className="text-gray-400">—</span>}
                  </Row>
                  {last?.message && (
                    <Row label="Message">
                      <span className="text-gray-500 truncate max-w-[180px] block">{last.message}</span>
                    </Row>
                  )}
                  <Row label="Next run">
                    <span className="text-gray-600">
                      {format(nextRun, 'h:mm a')} · {formatDistanceToNow(nextRun, { addSuffix: true })}
                    </span>
                  </Row>
                </div>
              </div>
            )
          })}
        </div>

        {/* Per-job history tables */}
        {JOBS.map((job) => {
          const runs = (logsByJob.get(job.key) ?? []).slice(0, 10)
          return (
            <div key={job.key} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{job.label} — last 10 runs</h2>
              {runs.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 bg-white rounded-xl border border-gray-200 px-5">
                  No runs recorded yet.
                </p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-2.5 font-medium text-gray-500">Ran at</th>
                        <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
                        <th className="px-4 py-2.5 font-medium text-gray-500">Records</th>
                        <th className="px-4 py-2.5 font-medium text-gray-500">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {runs.map((run) => (
                        <tr key={run.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            {format(new Date(run.ran_at), 'MMM d, h:mm:ss a')}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={clsx(
                              'inline-block text-xs font-semibold px-2 py-0.5 rounded-full',
                              run.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {run.records_processed ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">
                            {run.message ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span>{children}</span>
    </div>
  )
}
