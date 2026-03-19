'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('bondsman_id', user.id)

  revalidatePath('/notifications')
  revalidatePath('/dashboard')
}

export async function markAllRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('bondsman_id', user.id)
    .eq('read', false)

  revalidatePath('/notifications')
  revalidatePath('/dashboard')
}
