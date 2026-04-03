import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import Toaster from '@/components/Toaster'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('bondsman_id', user.id)
    .eq('read', false)

  return (
    <div className="min-h-screen bg-[#0f1e3c]">
      <Sidebar userEmail={user.email ?? ''} unreadCount={count ?? 0} />
      <main className="ml-0 md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav unreadCount={count ?? 0} />
      {/* Floating Add Bond button — mobile only, above bottom nav */}
      <Link
        href="/bonds/new"
        className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 bg-[#0f1e3c] text-white px-5 py-3.5 rounded-2xl font-bold text-base shadow-lg hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75 min-h-[52px]"
      >
        <PlusCircle className="w-5 h-5" />
        Add Bond
      </Link>
      <Toaster />
    </div>
  )
}
