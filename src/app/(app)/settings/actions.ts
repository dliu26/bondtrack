'use server'

/**
 * Run this SQL in Supabase to update the bondsman_settings table:
 *
 * -- If creating fresh:
 * create table bondsman_settings (
 *   id uuid primary key default uuid_generate_v4(),
 *   bondsman_id uuid not null references auth.users(id) on delete cascade,
 *   name text,
 *   phone text,
 *   agency_name text,
 *   show_daily_list boolean not null default true,
 *   default_checkin_frequency text not null default 'weekly'
 *     check (default_checkin_frequency in ('daily', 'weekly', 'custom')),
 *   default_county text,
 *   default_court text,
 *   created_at timestamptz not null default now(),
 *   unique (bondsman_id)
 * );
 * alter table bondsman_settings enable row level security;
 * create policy "own settings" on bondsman_settings
 *   for all using (bondsman_id = auth.uid());
 *
 * -- If migrating existing table:
 * alter table bondsman_settings
 *   drop column if exists sms_court_changes,
 *   drop column if exists sms_missed_checkins,
 *   drop column if exists sms_overdue_payments,
 *   drop column if exists sms_forfeiture_warnings,
 *   add column if not exists show_daily_list boolean not null default true;
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BondsmanSettings {
  name: string | null
  phone: string | null
  agency_name: string | null
  show_daily_list: boolean
  default_checkin_frequency: 'daily' | 'weekly' | 'custom'
  default_county: string | null
  default_court: string | null
}

export async function getSettings(): Promise<BondsmanSettings | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('bondsman_settings')
    .select('*')
    .eq('bondsman_id', user.id)
    .single()

  return data as BondsmanSettings | null
}

export async function saveProfile(data: {
  name: string
  phone: string
  agencyName: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '')
    if (digits.length !== 10 && !(digits.length === 11 && digits.startsWith('1'))) {
      return { error: 'Phone must be a valid 10-digit US number.' }
    }
  }

  const { error } = await supabase
    .from('bondsman_settings')
    .upsert({
      bondsman_id: user.id,
      name: data.name.trim() || null,
      phone: data.phone.trim() || null,
      agency_name: data.agencyName.trim() || null,
    }, { onConflict: 'bondsman_id' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function saveNotifications(prefs: {
  showDailyList: boolean
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('bondsman_settings')
    .upsert({
      bondsman_id: user.id,
      show_daily_list: prefs.showDailyList,
    }, { onConflict: 'bondsman_id' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function saveDefaults(defaults: {
  checkinFrequency: 'daily' | 'weekly' | 'custom'
  county: string
  court: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('bondsman_settings')
    .upsert({
      bondsman_id: user.id,
      default_checkin_frequency: defaults.checkinFrequency,
      default_county: defaults.county.trim() || null,
      default_court: defaults.court.trim() || null,
    }, { onConflict: 'bondsman_id' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function changePassword(data: {
  newPassword: string
  confirmPassword: string
}): Promise<{ error?: string }> {
  if (data.newPassword !== data.confirmPassword) {
    return { error: 'Passwords do not match.' }
  }
  if (data.newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: data.newPassword })
  if (error) return { error: error.message }
  return {}
}

export async function deleteAccount(confirmation: string): Promise<{ error?: string }> {
  if (confirmation !== 'DELETE') {
    return { error: 'Please type DELETE exactly to confirm.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }
  return {}
}
