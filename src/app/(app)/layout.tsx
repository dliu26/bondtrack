import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

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
    <div className="min-h-screen bg-gray-50">
      <Sidebar userEmail={user.email ?? ''} unreadCount={count ?? 0} />
      <main className="ml-0 md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav unreadCount={count ?? 0} />
    </div>
  )
}
