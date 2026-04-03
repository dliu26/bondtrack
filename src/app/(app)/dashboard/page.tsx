import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Archive } from 'lucide-react'
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 1. Active bonds + defendants ──────────────────────────────────────
  const { data: bondsRaw } = await supabase
    .from('bonds')
    .select('*, defendants(*), cosigners(id, first_name, last_name, phone)')
    .eq('bondsman_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const bonds: (Bond & { defendants: Defendant })[] = bondsRaw ?? []
  const bondIds = bonds.map((b) => b.id)
  const defendantIds = bonds.map((b) => b.defendant_id)

  // Count closed bonds for the link at the bottom
  const { count: closedCount } = await supabase
    .from('bonds')
    .select('id', { count: 'exact', head: true })
    .eq('bondsman_id', user.id)
    .in('status', ['exonerated', 'forfeited', 'closed'])

  if (bondIds.length === 0) {
    return <EmptyDashboard closedCount={closedCount ?? 0} />
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

  // For payments: overdue first, then upcoming; pick most urgent per bond
  const paymentByBond = new Map<string, Payment>()
  // First pass: overdue
  payments
    .filter((p) => p.status === 'overdue')
    .forEach((p) => {
      const existing = paymentByBond.get(p.bond_id)
      if (!existing) paymentByBond.set(p.bond_id, p)
    })
  // Second pass: upcoming (only if no overdue)
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
    const daysToForfeiture = bond.forfeiture_deadline ? getDaysToDate(bond.forfeiture_deadline) : null
    const daysPaymentOverdue =
      payment?.status === 'overdue' ? getDaysOverdue(payment.due_date) : null

    const urgency = calculateUrgency({
      daysToCourtDate,
      consecutiveMissedCheckins,
      daysPaymentOverdue,
      daysToForfeiture,
    })

    const cosigners = (bond as any).cosigners as Array<{id: string; first_name: string; last_name: string; phone: string | null}> | undefined
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
      cosignerName: firstCosignerWithPhone ? `${firstCosignerWithPhone.first_name} ${firstCosignerWithPhone.last_name}` : null,
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

  const redCount = processed.filter((b) => b.urgency === 'red').length
  const yellowCount = processed.filter((b) => b.urgency === 'yellow').length
  const greenCount = processed.filter((b) => b.urgency === 'green').length

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-6xl">
      <DismissibleBanner />

      {/* Page header */}
      <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            <span className="text-gray-500 text-sm md:text-base">{processed.length} active bonds</span>
            {redCount > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                {redCount} need attention
              </span>
            )}
            {yellowCount > 0 && (
              <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full">
                {yellowCount} follow up
              </span>
            )}
            {greenCount > 0 && (
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                {greenCount} on track
              </span>
            )}
          </div>
        </div>
        <Link
          href="/bonds/new"
          className="flex items-center gap-2 bg-[#0f1e3c] text-white px-4 py-3 md:px-5 rounded-xl font-semibold text-sm md:text-base hover:bg-[#1a2f5a] transition-colors shrink-0 min-h-[44px]"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Add Bond</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Today's Focus */}
      <TodaysFocus bonds={processed} />

      {/* Bond Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {processed.map((bond) => (
          <BondCard key={bond.id} bond={bond} />
        ))}
      </div>

      {/* Bond history button */}
      {(closedCount ?? 0) > 0 && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/bonds/history"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors min-h-[44px]"
          >
            <Archive className="w-4 h-4" />
            Bond History ({closedCount})
          </Link>
        </div>
      )}
    </div>
  )
}

function EmptyDashboard({ closedCount }: { closedCount: number }) {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-6xl">
      <DismissibleBanner />
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/bonds/new"
          className="flex items-center gap-2 bg-[#0f1e3c] text-white px-4 py-3 md:px-5 rounded-xl font-semibold text-sm md:text-base hover:bg-[#1a2f5a] transition-colors min-h-[44px]"
        >
          <PlusCircle className="w-5 h-5" />
          Add Bond
        </Link>
      </div>
      <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <PlusCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to BondTrack</h2>
        <p className="text-gray-500 text-lg mb-8 max-w-sm mx-auto">Add your first bond to get started. It only takes a few minutes.</p>
        <Link
          href="/bonds/new"
          className="inline-flex items-center gap-2 bg-[#0f1e3c] text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75"
        >
          <PlusCircle className="w-6 h-6" />
          Add Your First Bond
        </Link>
      </div>
      {closedCount > 0 && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/bonds/history"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors min-h-[44px]"
          >
            <Archive className="w-4 h-4" />
            Bond History ({closedCount})
          </Link>
        </div>
      )}
    </div>
  )
}
