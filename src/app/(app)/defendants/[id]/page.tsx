import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DefendantInfoCard from './_components/DefendantInfoCard'
import NotesEditor from './_components/NotesEditor'
import BondDetailCard from './_components/BondDetailCard'
import CheckinTable from './_components/CheckinTable'
import CallLogTable from './_components/CallLogTable'
import PastBondsSection from './_components/PastBondsSection'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DefendantPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch defendant ───────────────────────────────────────────────────
  const { data: defendant } = await supabase
    .from('defendants')
    .select('*')
    .eq('id', id)
    .eq('bondsman_id', user.id)
    .single()

  if (!defendant) notFound()

  // ── Parallel fetch: bonds (with relations) + check-ins + call logs ────
  const [bondsRes, checkinsRes, callLogsRes] = await Promise.all([
    supabase
      .from('bonds')
      .select('*, cosigners(*), court_dates(*), payments(*)')
      .eq('defendant_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('checkins')
      .select('*')
      .eq('defendant_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(50),
    supabase
      .from('call_logs')
      .select('*')
      .eq('defendant_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const bonds = bondsRes.data ?? []
  const checkins = checkinsRes.data ?? []
  const callLogs = callLogsRes.data ?? []

  const activeBonds = bonds.filter((b) => b.status === 'active')
  const inactiveBonds = bonds.filter((b) => b.status !== 'active')

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-base mb-5 transition-colors min-h-[44px]"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="space-y-6">
        {/* Defendant info (editable) */}
        <DefendantInfoCard defendant={defendant} />

        {/* Notes (auto-save) */}
        <NotesEditor defendantId={id} initialNotes={defendant.notes} />

        {/* Active bonds */}
        {activeBonds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Active Bond{activeBonds.length > 1 ? 's' : ''}
            </h2>
            {activeBonds.map((bond) => (
              <BondDetailCard key={bond.id} bond={bond} defendantId={id} />
            ))}
          </div>
        )}

        {/* Inactive bonds — collapsible */}
        {inactiveBonds.length > 0 && (
          <PastBondsSection count={inactiveBonds.length}>
            {inactiveBonds.map((bond) => (
              <BondDetailCard key={bond.id} bond={bond} defendantId={id} />
            ))}
          </PastBondsSection>
        )}

        {bonds.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-lg">No bonds on record for this defendant.</p>
            <Link
              href="/bonds/new"
              className="inline-block mt-4 text-[#0f1e3c] font-semibold hover:underline"
            >
              Add a bond →
            </Link>
          </div>
        )}

        {/* Check-in history */}
        <CheckinTable checkins={checkins} />

        {/* Call log */}
        <CallLogTable callLogs={callLogs} />
      </div>
    </div>
  )
}
