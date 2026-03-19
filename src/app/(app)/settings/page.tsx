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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile, notifications, and account.</p>
      </div>
      <SettingsForm settings={settings} email={user.email ?? ''} />
    </div>
  )
}
