'use server'

/**
 * Run this SQL in Supabase before deploying:
 *
 * create table call_logs (
 *   id           uuid primary key default uuid_generate_v4(),
 *   defendant_id uuid not null references defendants(id) on delete cascade,
 *   bondsman_id  uuid not null references auth.users(id) on delete cascade,
 *   called_name  text not null,
 *   phone        text not null,
 *   outcome      text not null check (outcome in ('reached','no_answer','voicemail')),
 *   created_at   timestamptz not null default now()
 * );
 * alter table call_logs enable row level security;
 * create policy "own call_logs" on call_logs
 *   for all using (bondsman_id = auth.uid());
 * create index on call_logs (defendant_id, created_at desc);
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logCallOutcome(data: {
  defendantId: string
  phone: string
  calledName: string
  outcome: 'reached' | 'no_answer' | 'voicemail'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('call_logs').insert({
    defendant_id: data.defendantId,
    bondsman_id: user.id,
    called_name: data.calledName,
    phone: data.phone,
    outcome: data.outcome,
  })

  if (error) return { error: error.message }
  revalidatePath(`/defendants/${data.defendantId}`)
  return {}
}
