'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, format } from 'date-fns'
import type { CheckinFrequency, BondStatus, CourtDateStatus } from '@/types/database'

function revalidate(defendantId: string) {
  revalidatePath(`/defendants/${defendantId}`)
  revalidatePath('/dashboard')
}

export async function updateDefendant(
  defendantId: string,
  data: {
    firstName: string
    lastName: string
    dob: string
    phone: string
    address: string
    checkinFrequency: CheckinFrequency
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('defendants')
    .update({
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      dob: data.dob || null,
      phone: data.phone || null,
      address: data.address || null,
      checkin_frequency: data.checkinFrequency,
    })
    .eq('id', defendantId)
    .eq('bondsman_id', user.id)

  if (error) return { error: error.message }
  revalidate(defendantId)
}

export async function updateNotes(defendantId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('defendants')
    .update({ notes: notes || null })
    .eq('id', defendantId)
    .eq('bondsman_id', user.id)

  if (error) return { error: error.message }
  revalidate(defendantId)
}

export async function updateCourtDateStatus(
  courtDateId: string,
  newStatus: CourtDateStatus,
  bondId: string,
  courtDateIso: string,
  defendantId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('court_dates')
    .update({ status: newStatus })
    .eq('id', courtDateId)

  if (error) return { error: error.message }

  if (newStatus === 'missed') {
    const deadline = format(addDays(new Date(courtDateIso), 90), 'yyyy-MM-dd')

    await supabase
      .from('bonds')
      .update({ forfeiture_deadline: deadline })
      .eq('id', bondId)

    await supabase.from('notifications').insert({
      bondsman_id: user.id,
      bond_id: bondId,
      message: `Court date missed on ${courtDateIso}. Forfeiture deadline set to ${deadline}. You have 90 days to act.`,
      type: 'forfeiture_warning',
    })
  }

  revalidate(defendantId)
}

export async function addCourtDate(
  bondId: string,
  defendantId: string,
  data: { date: string; time: string; location: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('court_dates').insert({
    bond_id: bondId,
    date: data.date,
    time: data.time || null,
    location: data.location || null,
    status: 'upcoming',
  })

  if (error) return { error: error.message }
  revalidate(defendantId)
}

export async function markPaymentPaid(
  paymentId: string,
  amountDue: number,
  defendantId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      amount_paid: amountDue,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (error) return { error: error.message }
  revalidate(defendantId)
}

export async function updateBondStatus(
  bondId: string,
  newStatus: BondStatus,
  defendantId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('bonds')
    .update({ status: newStatus })
    .eq('id', bondId)
    .eq('bondsman_id', user.id)

  if (error) return { error: error.message }
  revalidate(defendantId)
}
