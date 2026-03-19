/** Shared validation helpers used on both client and server. */

export function validatePhone(phone: string): string | null {
  if (!phone) return null // optional
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return null
  if (digits.length === 11 && digits.startsWith('1')) return null
  return 'Phone must be a valid 10-digit US number (e.g. 214-555-0100)'
}

export function validateDob(dob: string): string | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return 'Invalid date of birth'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d > today) return 'Date of birth cannot be in the future'
  const age = today.getFullYear() - d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
  if (age < 18) return 'Defendant must be at least 18 years old'
  return null
}

export function validateCaseNumber(cn: string): string | null {
  if (!cn) return null
  if (!/^[A-Za-z0-9\-]+$/.test(cn)) {
    return 'Case number may only contain letters, numbers, and dashes'
  }
  return null
}

export function validateCourtDate(date: string): string | null {
  if (!date) return null
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d < today) return 'Court date cannot be set in the past'
  return null
}

/** Returns errors keyed by field name. Empty object = valid. */
export function validateBondStep(bond: {
  bondAmount: string
  premiumOwed: string
  premiumPaid: string
  caseNumber: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  const amount = parseFloat(bond.bondAmount)
  const owed = parseFloat(bond.premiumOwed)
  const paid = parseFloat(bond.premiumPaid)

  if (!bond.bondAmount || isNaN(amount) || amount <= 0) {
    errors.bondAmount = 'Bond amount must be greater than $0'
  }
  if (!bond.premiumOwed || isNaN(owed) || owed < 0) {
    errors.premiumOwed = 'Premium owed is required'
  } else if (!isNaN(amount) && owed > amount) {
    errors.premiumOwed = 'Premium owed cannot exceed bond amount'
  }
  if (!isNaN(paid) && !isNaN(owed) && paid > owed) {
    errors.premiumPaid = 'Premium paid cannot exceed premium owed'
  }
  const cnErr = validateCaseNumber(bond.caseNumber)
  if (cnErr) errors.caseNumber = cnErr
  return errors
}

export function validateDefendantStep(def: {
  mode: 'search' | 'new'
  existingId: string
  firstName: string
  lastName: string
  phone: string
  dob: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (def.mode === 'search') {
    if (!def.existingId) errors.defendant = 'Please select a defendant or switch to "Add New"'
    return errors
  }
  if (!def.firstName.trim()) errors.firstName = 'First name is required'
  if (!def.lastName.trim()) errors.lastName = 'Last name is required'
  const phoneErr = validatePhone(def.phone)
  if (phoneErr) errors.phone = phoneErr
  const dobErr = validateDob(def.dob)
  if (dobErr) errors.dob = dobErr
  return errors
}

export function validateCourtDateStep(cd: {
  skip: boolean
  date: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!cd.skip) {
    if (!cd.date) {
      errors.date = 'Court date is required (or select "No court date yet")'
    } else {
      const err = validateCourtDate(cd.date)
      if (err) errors.date = err
    }
  }
  return errors
}

export function validatePaymentsStep(
  payments: Array<{ amountDue: string; dueDate: string }>,
  premiumOwed: string
): Record<string, string> {
  if (payments.length === 0) return {}
  const errors: Record<string, string> = {}
  const owed = parseFloat(premiumOwed) || 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let total = 0
  const seenDates = new Set<string>()
  let prevDate = ''

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i]
    const amount = parseFloat(p.amountDue)
    if (isNaN(amount) || amount <= 0) {
      errors[`payment_${i}_amount`] = `Payment #${i + 1}: amount must be greater than $0`
    } else {
      total += amount
    }
    if (!p.dueDate) {
      errors[`payment_${i}_date`] = `Payment #${i + 1}: due date is required`
    } else {
      const d = new Date(p.dueDate)
      if (d < today) {
        errors[`payment_${i}_date`] = `Payment #${i + 1}: due date must be in the future`
      } else if (seenDates.has(p.dueDate)) {
        errors[`payment_${i}_date`] = `Payment #${i + 1}: duplicate due date`
      } else if (prevDate && p.dueDate < prevDate) {
        errors[`payment_${i}_date`] = `Payment #${i + 1}: due dates must be in chronological order`
      } else {
        seenDates.add(p.dueDate)
        prevDate = p.dueDate
      }
    }
  }

  if (owed > 0 && total > owed + 0.01) {
    errors.total = `Total scheduled ($${total.toFixed(2)}) exceeds premium owed ($${owed.toFixed(2)})`
  }

  return errors
}
