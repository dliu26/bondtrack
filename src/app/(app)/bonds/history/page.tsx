import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import HistoryList from './HistoryList'
import type { ClosedBond } from './HistoryList'

export const dynamic = 'force-dynamic'

export default async function BondHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bondsRaw } = await supabase
    .from('bonds')
    .select('id, bond_amount, charge, case_number, county, status, created_at, defendants(id, first_name, last_name)')
    .eq('bondsman_id', user.id)
    .in('status', ['exonerated', 'forfeited', 'closed'])
    .order('created_at', { ascending: false })

  const bonds: ClosedBond[] = (bondsRaw ?? []).map((b) => {
    const defRaw = Array.isArray(b.defendants) ? b.defendants[0] : b.defendants
    const def = defRaw as { id: string; first_name: string; last_name: string } | null
    return {
      id: b.id,
      bond_amount: b.bond_amount,
      charge: b.charge,
      case_number: b.case_number,
      county: b.county,
      status: b.status as ClosedBond['status'],
      created_at: b.created_at,
      defendant: def ?? { id: '', first_name: 'Unknown', last_name: '' },
      last_court_date: null,
    }
  })

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-base mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bond History</h1>
          <span className="text-gray-400 text-sm">{bonds.length} bond{bonds.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-gray-500 mt-1">Exonerated, forfeited, and closed bonds.</p>
      </div>

      <HistoryList bonds={bonds} />
    </div>
  )
}
