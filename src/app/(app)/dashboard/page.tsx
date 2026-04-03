import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Archive, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import BondCard from '@/components/BondCard'
import TodaysFocus from './_components/TodaysFocus'
import DismissibleBanner from './_components/DismissibleBanner'
import {
  calculateUrgency,
  getDaysToDate,
  getDaysOverdue,
  getConsecutiveMissedCheckins,
} from '@/lib/urgency'
import type { Bond, Defendant, CourtDate, Payment, Checkin, ProcessedBond } from '@/types/database'

export const dynamic = 'force-dynamic'

function getGreeting() {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date())
  )
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({
  label,
  value,
  subtext,
  urgent,
}: {
  label: string
  value: string | number
  subtext?: string
  urgent?: 'red' | 'amber'
}) {
  const valueColor =
    urgent === 'red'
      ? 'text-red-400'
      : urgent === 'amber'
      ? 'text-amber-300'
      : 'text-white'
  return (
    <div className="bg-[#1a2d4f] rounded-xl border border-white/10 px-4 py-4 shadow-lg">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 truncate">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  )
}

function SubscriptionBanner({ subscription }: { subscription: { status: string } | null }) {
  if (!subscription) {
    return (
      <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-4">
        <p className="text-amber-300 text-sm">
          Start your free 30-day trial to unlock BondTrack
        </p>
        <Link
          href="/pricing"
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Start Free Trial
        </Link>
      </div>
    )
  }

  if (subscription.status === 'past_due') {
    return (
      <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-4">
        <p className="text-amber-300 text-sm">
          Your payment failed. Update your billing to keep access.
        </p>
        <Link
          href="/pricing"
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Update Billing
        </Link>
      </div>
    )
  }

  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const subRes = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const subscription = subRes.data

  // ── 1. Parallel: active bonds + settings + closed count ───────────────
  const [bondsRes, settingsRes, closedCountRes] = await Promise.all([
    supabase
      .from('bonds')
      .select('*, defendants(*), cosigners(id, first_name, last_name, phone)')
      .eq('bondsman_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('bondsman_settings')
      .select('name')
      .eq('bondsman_id', user.id)
      .maybeSingle(),
    supabase
      .from('bonds')
      .select('id', { count: 'exact', head: true })
      .eq('bondsman_id', user.id)
      .in('status', ['exonerated', 'forfeited', 'closed']),
  ])

  const bonds: (Bond & { defendants: Defendant })[] = bondsRes.data ?? []
  const bondIds = bonds.map((b) => b.id)
  const defendantIds = bonds.map((b) => b.defendant_id)
  const closedCount = closedCountRes.count ?? 0
  const firstName = settingsRes.data?.name?.trim().split(' ')[0] ?? null
  const greeting = getGreeting()

  if (bondIds.length === 0) {
    return (
      <EmptyDashboard
        closedCount={closedCount}
        greeting={greeting}
        firstName={firstName}
        subscription={subscription}
      />
    )
  }

  // ── 2. Parallel fetch: court dates, payments, check-ins ───────────────
  const [courtDatesRes, paymentsRes, checkinsRes] = await Promise.all([
    supabase
      .from('court_dates')
      .select('*')
      .in('bond_id', bondIds)
      .eq('status', 'upcoming')
      .order('date', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .in('bond_id', bondIds)
      .in('status', ['upcoming', 'overdue'])
      .order('due_date', { ascending: true }),
    supabase
      .from('checkins')
      .select('*')
      .in('defendant_id', defendantIds)
      .order('scheduled_at', { ascending: false })
      .limit(300),
  ])

  const courtDates: CourtDate[] = courtDatesRes.data ?? []
  const payments: Payment[] = paymentsRes.data ?? []
  const checkins: Checkin[] = checkinsRes.data ?? []

  // ── 3. Group by bond/defendant ─────────────────────────────────────────
  const courtByBond = new Map<string, CourtDate>()
  courtDates.forEach((cd) => {
    if (!courtByBond.has(cd.bond_id)) courtByBond.set(cd.bond_id, cd)
  })

  const paymentByBond = new Map<string, Payment>()
  payments
    .filter((p) => p.status === 'overdue')
    .forEach((p) => {
      if (!paymentByBond.has(p.bond_id)) paymentByBond.set(p.bond_id, p)
    })
  payments
    .filter((p) => p.status === 'upcoming')
    .forEach((p) => {
      if (!paymentByBond.has(p.bond_id)) paymentByBond.set(p.bond_id, p)
    })

  const checkinsByDefendant = new Map<string, Checkin[]>()
  checkins.forEach((c) => {
    const arr = checkinsByDefendant.get(c.defendant_id) ?? []
    arr.push(c)
    checkinsByDefendant.set(c.defendant_id, arr)
  })

  // ── 4. Build processed bonds ──────────────────────────────────────────
  const processed: ProcessedBond[] = bonds.map((bond) => {
    const defendant = bond.defendants
    const nextCourtDate = courtByBond.get(bond.id) ?? null
    const payment = paymentByBond.get(bond.id) ?? null
    const defCheckins = checkinsByDefendant.get(bond.defendant_id) ?? []
    const consecutiveMissedCheckins = getConsecutiveMissedCheckins(defCheckins)

    const daysToCourtDate = nextCourtDate ? getDaysToDate(nextCourtDate.date) : null
    const daysToForfeiture = bond.forfeiture_deadline
      ? getDaysToDate(bond.forfeiture_deadline)
      : null
    const daysPaymentOverdue =
      payment?.status === 'overdue' ? getDaysOverdue(payment.due_date) : null

    const urgency = calculateUrgency({
      daysToCourtDate,
      consecutiveMissedCheckins,
      daysPaymentOverdue,
      daysToForfeiture,
    })

    const cosigners = (bond as any).cosigners as
      | Array<{ id: string; first_name: string; last_name: string; phone: string | null }>
      | undefined
    const firstCosignerWithPhone = cosigners?.find((c) => c.phone) ?? null

    return {
      id: bond.id,
      bondAmount: bond.bond_amount,
      charge: bond.charge,
      caseNumber: bond.case_number,
      county: bond.county,
      court: bond.court,
      forfeitureDeadline: bond.forfeiture_deadline,
      daysToForfeiture,
      defendant: {
        id: defendant.id,
        firstName: defendant.first_name,
        lastName: defendant.last_name,
        phone: defendant.phone,
        lastCheckinAt: defendant.last_checkin_at,
      },
      cosignerPhone: firstCosignerWithPhone?.phone ?? null,
      cosignerName: firstCosignerWithPhone
        ? `${firstCosignerWithPhone.first_name} ${firstCosignerWithPhone.last_name}`
        : null,
      nextCourtDate: nextCourtDate
        ? {
            id: nextCourtDate.id,
            date: nextCourtDate.date,
            time: nextCourtDate.time,
            location: nextCourtDate.location,
          }
        : null,
      daysToCourtDate,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            dueDate: payment.due_date,
            amountDue: payment.amount_due,
            daysOverdue: daysPaymentOverdue,
          }
        : null,
      consecutiveMissedCheckins,
      urgency,
    }
  })

  // ── 5. Sort: red → yellow → green, then by days-to-court-date ─────────
  const urgencyOrder = { red: 0, yellow: 1, green: 2 }
  processed.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    const aDays = a.daysToCourtDate ?? 9999
    const bDays = b.daysToCourtDate ?? 9999
    return aDays - bDays
  })

  // ── 6. Stats ──────────────────────────────────────────────────────────
  const courtSoon = processed.filter(
    (b) => b.daysToCourtDate !== null && b.daysToCourtDate >= 0 && b.daysToCourtDate <= 14
  ).length
  const overduePayments = processed.filter((b) => b.payment?.status === 'overdue').length
  const forfeitureValues = processed
    .filter((b) => b.daysToForfeiture !== null && b.daysToForfeiture > 0)
    .map((b) => b.daysToForfeiture!)
  const nextForfeiture =
    forfeitureValues.length > 0 ? Math.min(...forfeitureValues) : null

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl">
      <SubscriptionBanner subscription={subscription} />
      <DismissibleBanner />

      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white">Dashboard</h1>
          </div>
          <Link
            href="/bonds/new"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 md:px-5 rounded-xl font-semibold text-sm md:text-base hover:bg-blue-700 transition-colors min-h-[44px] sm:shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Add Bond
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active Bonds" value={processed.length} />
        <StatCard
          label="Court (14 days)"
          value={courtSoon}
          subtext="upcoming"
          urgent={courtSoon > 0 ? 'amber' : undefined}
        />
        <StatCard
          label="Overdue Payments"
          value={overduePayments}
          urgent={overduePayments > 0 ? 'red' : undefined}
        />
        <StatCard
          label="Next Forfeiture"
          value={nextForfeiture !== null ? `${nextForfeiture}d` : '—'}
          subtext={nextForfeiture !== null ? 'remaining' : 'none set'}
          urgent={
            nextForfeiture !== null && nextForfeiture <= 7
              ? 'red'
              : nextForfeiture !== null && nextForfeiture <= 30
              ? 'amber'
              : undefined
          }
        />
      </div>

      {/* Today's Focus */}
      <TodaysFocus bonds={processed} />

      {/* Bond Cards — single column */}
      <div className="space-y-4">
        {processed.map((bond) => (
          <BondCard key={bond.id} bond={bond} />
        ))}
      </div>

      {/* Bond history button */}
      {closedCount > 0 && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/bonds/history"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/20 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:border-white/30 transition-colors min-h-[44px]"
          >
            <Archive className="w-4 h-4" />
            Bond History ({closedCount})
          </Link>
        </div>
      )}
    </div>
  )
}

function EmptyDashboard({
  closedCount,
  greeting,
  firstName,
  subscription,
}: {
  closedCount: number
  greeting: string
  firstName: string | null
  subscription: { status: string } | null
}) {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl">
      <SubscriptionBanner subscription={subscription} />
      <DismissibleBanner />

      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white">Dashboard</h1>
          </div>
          <Link
            href="/bonds/new"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 md:px-5 rounded-xl font-semibold text-sm md:text-base hover:bg-blue-700 transition-colors min-h-[44px] sm:shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Add Bond
          </Link>
        </div>
      </div>

      {/* Empty state */}
      <div className="text-center py-20 bg-[#1a2d4f] rounded-2xl border border-white/10">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Shield className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">No active bonds</h2>
        <p className="text-slate-400 text-base mb-8 max-w-sm mx-auto">
          Add your first bond to start tracking court dates, payments, and check-ins.
        </p>
        <Link
          href="/bonds/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors active:scale-95 duration-75 min-h-[44px]"
        >
          <PlusCircle className="w-5 h-5" />
          Add Your First Bond
        </Link>
      </div>

      {closedCount > 0 && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/bonds/history"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/20 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:border-white/30 transition-colors min-h-[44px]"
          >
            <Archive className="w-4 h-4" />
            Bond History ({closedCount})
          </Link>
        </div>
      )}
    </div>
  )
}
