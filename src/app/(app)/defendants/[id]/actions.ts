'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, format } from 'date-fns'
import type { CheckinFrequency, BondStatus, CourtDateStatus } from '@/types/database'
import { validatePhone, validateDob } from '@/lib/validation'

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
    checkinHourCt: number
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Server-side validation
  if (!data.firstName.trim() || !data.lastName.trim()) return { error: 'First and last name are required.' }
  if (data.phone) {
    const err = validatePhone(data.phone)
    if (err) return { error: err }
  }
  if (data.dob) {
    const err = validateDob(data.dob)
    if (err) return { error: err }
  }
  const hour = Math.round(data.checkinHourCt)
  if (hour < 0 || hour > 23) return { error: 'Invalid check-in hour.' }

  const { error } = await supabase
    .from('defendants')
    .update({
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      dob: data.dob || null,
      phone: data.phone || null,
      address: data.address || null,
      checkin_frequency: data.checkinFrequency,
      checkin_hour_ct: hour,
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

  // Fetch current bond state for validation
  const { data: current } = await supabase
    .from('bonds')
    .select('status')
    .eq('id', bondId)
    .eq('bondsman_id', user.id)
    .single()

  if (!current) return { error: 'Bond not found.' }

  // Cannot reactivate a forfeited bond
  if (current.status === 'forfeited' && newStatus === 'active') {
    return { error: 'A forfeited bond cannot be set back to active.' }
  }

  const { error } = await supabase
    .from('bonds')
    .update({ status: newStatus })
    .eq('id', bondId)
    .eq('bondsman_id', user.id)

  if (error) return { error: error.message }
  revalidate(defendantId)
}

export async function markCheckinConfirmed(defendantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: defendant } = await supabase
    .from('defendants')
    .select('id')
    .eq('id', defendantId)
    .eq('bondsman_id', user.id)
    .single()
  if (!defendant) return { error: 'Defendant not found.' }

  const now = new Date().toISOString()
  await supabase.from('checkins').insert({
    defendant_id: defendantId,
    scheduled_at: now,
    responded_at: now,
    response: 'manual',
    status: 'confirmed',
  })
  await supabase
    .from('defendants')
    .update({ last_checkin_at: now })
    .eq('id', defendantId)

  revalidate(defendantId)
}

/**
 * Creates an in-app notification for the bondsman — used by Today's Focus
 * "Confirm Ready" actions so the acknowledgement is recorded without
 * writing anything to the defendant's notes field.
 */
export async function createDashboardNotification(bondId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify the bond belongs to this bondsman
  const { data: bond } = await supabase
    .from('bonds')
    .select('id')
    .eq('id', bondId)
    .eq('bondsman_id', user.id)
    .single()
  if (!bond) return { error: 'Bond not found.' }

  await supabase.from('notifications').insert({
    bondsman_id: user.id,
    bond_id: bondId,
    message,
    type: 'court_change',
  })
}

export async function logNote(defendantId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: defendant } = await supabase
    .from('defendants')
    .select('notes, bondsman_id')
    .eq('id', defendantId)
    .eq('bondsman_id', user.id)
    .single()
  if (!defendant) return { error: 'Defendant not found.' }

  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
  const entry = `[${timestamp}] ${note}`
  const newNotes = [defendant.notes, entry].filter(Boolean).join('\n')

  await supabase
    .from('defendants')
    .update({ notes: newNotes })
    .eq('id', defendantId)

  revalidate(defendantId)
}
