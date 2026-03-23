'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { CheckinFrequency } from '@/types/database'
import {
  validatePhone,
  validateDob,
  validateCaseNumber,
  validateCourtDate,
} from '@/lib/validation'

export interface CreateBondInput {
  defendant: {
    mode: 'existing' | 'new'
    existingId?: string
    firstName?: string
    lastName?: string
    dob?: string
    phone?: string
    address?: string
    checkinFrequency?: CheckinFrequency
    checkinHourCt?: number
  }
  bond: {
    bondAmount: number
    premiumOwed: number
    premiumPaid: number
    charge: string
    caseNumber: string
    county: string
    court: string
  }
  cosigners: Array<{
    firstName: string
    lastName: string
    phone: string
    address: string
    relationship: string
    assetsDescription: string
  }>
  courtDate: {
    skip: boolean
    date: string
    time: string
    location: string
  }
  payments: Array<{
    amountDue: number
    dueDate: string
  }>
}

export async function searchDefendants(query: string) {
  if (query.trim().length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('defendants')
    .select('id, first_name, last_name, dob, phone')
    .eq('bondsman_id', user.id)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order('last_name', { ascending: true })
    .limit(10)

  return data ?? []
}

export async function createBond(input: CreateBondInput): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated. Please sign in.' }

  // ── Step 1: Get or create defendant ───────────────────────────────────
  let defendantId: string

  if (input.defendant.mode === 'existing') {
    if (!input.defendant.existingId) return { error: 'No defendant selected.' }
    defendantId = input.defendant.existingId
  } else {
    if (!input.defendant.firstName?.trim() || !input.defendant.lastName?.trim()) {
      return { error: 'Defendant first and last name are required.' }
    }
    const { data: newDef, error: defErr } = await supabase
      .from('defendants')
      .insert({
        bondsman_id: user.id,
        first_name: input.defendant.firstName.trim(),
        last_name: input.defendant.lastName.trim(),
        dob: input.defendant.dob || null,
        phone: input.defendant.phone || null,
        address: input.defendant.address || null,
        checkin_frequency: input.defendant.checkinFrequency ?? 'weekly',
        checkin_hour_ct: input.defendant.checkinHourCt ?? 8,
      })
      .select('id')
      .single()

    if (defErr || !newDef) return { error: defErr?.message ?? 'Failed to create defendant.' }
    defendantId = newDef.id
  }

  // ── Server-side validation ─────────────────────────────────────────────
  // Defendant phone / dob
  if (input.defendant.mode === 'new') {
    if (input.defendant.phone) {
      const err = validatePhone(input.defendant.phone)
      if (err) return { error: err }
    }
    if (input.defendant.dob) {
      const err = validateDob(input.defendant.dob)
      if (err) return { error: err }
    }
  }

  // Bond amounts
  if (!input.bond.bondAmount || input.bond.bondAmount <= 0)
    return { error: 'Bond amount must be greater than $0.' }
  if (input.bond.premiumOwed > input.bond.bondAmount)
    return { error: 'Premium owed cannot exceed bond amount.' }
  if (input.bond.premiumPaid > input.bond.premiumOwed)
    return { error: 'Premium paid cannot exceed premium owed.' }

  // Case number format
  if (input.bond.caseNumber) {
    const err = validateCaseNumber(input.bond.caseNumber)
    if (err) return { error: err }
  }

  // Court date not in past
  if (!input.courtDate.skip && input.courtDate.date) {
    const err = validateCourtDate(input.courtDate.date)
    if (err) return { error: err }
  }

  // Payment validation
  if (input.payments.length > 0) {
    for (const p of input.payments) {
      if (p.amountDue <= 0) return { error: 'Each payment amount must be greater than $0.' }
    }
    const total = input.payments.reduce((s, p) => s + p.amountDue, 0)
    if (input.bond.premiumOwed > 0 && total > input.bond.premiumOwed + 0.01) {
      return { error: `Payment total ($${total.toFixed(2)}) exceeds premium owed ($${input.bond.premiumOwed.toFixed(2)}).` }
    }
    const dates = input.payments.map((p) => p.dueDate)
    const today = new Date(); today.setHours(0,0,0,0)
    for (let i = 0; i < dates.length; i++) {
      if (new Date(dates[i]) < today) return { error: `Payment #${i+1} due date must be in the future.` }
      if (i > 0 && dates[i] <= dates[i-1]) return { error: `Payment due dates must be in chronological order with no duplicates.` }
    }
  }

  // ── Step 2: Create bond ────────────────────────────────────────────────

  const { data: bond, error: bondErr } = await supabase
    .from('bonds')
    .insert({
      bondsman_id: user.id,
      defendant_id: defendantId,
      bond_amount: input.bond.bondAmount,
      premium_owed: input.bond.premiumOwed,
      premium_paid: input.bond.premiumPaid,
      charge: input.bond.charge || null,
      case_number: input.bond.caseNumber || null,
      county: input.bond.county || null,
      court: input.bond.court || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (bondErr || !bond) return { error: bondErr?.message ?? 'Failed to create bond.' }

  // ── Step 3: Create co-signers (best effort) ────────────────────────────
  const validCosigners = input.cosigners.filter(
    (c) => c.firstName.trim() && c.lastName.trim()
  )
  if (validCosigners.length > 0) {
    await supabase.from('cosigners').insert(
      validCosigners.map((c) => ({
        bond_id: bond.id,
        first_name: c.firstName.trim(),
        last_name: c.lastName.trim(),
        phone: c.phone || null,
        address: c.address || null,
        relationship: c.relationship || null,
        assets_description: c.assetsDescription || null,
      }))
    )
  }

  // ── Step 4: Create court date (best effort) ────────────────────────────
  if (!input.courtDate.skip && input.courtDate.date) {
    await supabase.from('court_dates').insert({
      bond_id: bond.id,
      date: input.courtDate.date,
      time: input.courtDate.time || null,
      location: input.courtDate.location || null,
      status: 'upcoming',
    })
  }

  // ── Step 5: Create payments (best effort) ─────────────────────────────
  const validPayments = input.payments.filter((p) => p.amountDue > 0 && p.dueDate)
  if (validPayments.length > 0) {
    await supabase.from('payments').insert(
      validPayments.map((p) => ({
        bond_id: bond.id,
        amount_due: p.amountDue,
        due_date: p.dueDate,
        amount_paid: 0,
        status: 'upcoming',
      }))
    )
  }

  redirect(`/defendants/${defendantId}`)
}
