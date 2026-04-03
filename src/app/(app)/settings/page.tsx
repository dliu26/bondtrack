import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from './actions'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const settings = await getSettings()

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-2xl">
      <div className="pb-6 mb-6 border-b border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your profile, notifications, and account.</p>
      </div>
      <SettingsForm settings={settings} email={user.email ?? ''} />
    </div>
  )
}
