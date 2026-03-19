import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsList from './_components/NotificationsList'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch notifications joined with bonds so we can resolve defendant_id for links
  const { data: rows } = await supabase
    .from('notifications')
    .select('id, message, type, read, created_at, bond_id, bonds(defendant_id)')
    .eq('bondsman_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = (rows ?? []).map((n) => ({
    id: n.id,
    message: n.message,
    type: n.type,
    read: n.read,
    created_at: n.created_at,
    defendant_id:
      n.bonds && !Array.isArray(n.bonds)
        ? (n.bonds as { defendant_id: string }).defendant_id
        : null,
  }))

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl">
      <NotificationsList initialNotifications={notifications} />
    </div>
  )
}
