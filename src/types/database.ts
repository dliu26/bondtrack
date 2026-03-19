export type BondStatus = 'active' | 'forfeited' | 'exonerated' | 'closed'
export type CourtDateStatus = 'upcoming' | 'completed' | 'missed' | 'cancelled'
export type CheckinStatus = 'pending' | 'confirmed' | 'missed'
export type PaymentStatus = 'upcoming' | 'paid' | 'overdue'
export type NotificationType = 'court_change' | 'checkin_missed' | 'payment_overdue' | 'forfeiture_warning'
export type CheckinFrequency = 'daily' | 'weekly' | 'custom'
export type UrgencyLevel = 'red' | 'yellow' | 'green'

export interface Defendant {
  id: string
  bondsman_id: string
  first_name: string
  last_name: string
  dob: string | null
  phone: string | null
  address: string | null
  checkin_frequency: CheckinFrequency
  last_checkin_at: string | null
  notes: string | null
  created_at: string
}

export interface Bond {
  id: string
  bondsman_id: string
  defendant_id: string
  bond_amount: number
  premium_owed: number
  premium_paid: number
  charge: string | null
  case_number: string | null
  county: string | null
  court: string | null
  status: BondStatus
  forfeiture_deadline: string | null
  created_at: string
}

export interface CourtDate {
  id: string
  bond_id: string
  date: string
  time: string | null
  location: string | null
  status: CourtDateStatus
  reminder_sent_14d: boolean
  reminder_sent_3d: boolean
}

export interface Checkin {
  id: string
  defendant_id: string
  scheduled_at: string
  responded_at: string | null
  response: string | null
  status: CheckinStatus
}

export interface Payment {
  id: string
  bond_id: string
  amount_due: number
  due_date: string
  amount_paid: number
  paid_at: string | null
  status: PaymentStatus
}

export interface Cosigner {
  id: string
  bond_id: string
  first_name: string
  last_name: string
  phone: string | null
  address: string | null
  relationship: string | null
  assets_description: string | null
}

export interface Notification {
  id: string
  bondsman_id: string
  bond_id: string | null
  message: string
  type: NotificationType
  read: boolean
  created_at: string
}

export interface Briefing {
  id: string
  bondsman_id: string
  date: string
  content: string
  created_at: string
}

// Processed type used by the dashboard
export interface ProcessedBond {
  id: string
  bondAmount: number
  charge: string | null
  caseNumber: string | null
  county: string | null
  court: string | null
  forfeitureDeadline: string | null
  daysToForfeiture: number | null
  defendant: {
    id: string
    firstName: string
    lastName: string
    lastCheckinAt: string | null
  }
  nextCourtDate: {
    id: string
    date: string
    time: string | null
    location: string | null
  } | null
  daysToCourtDate: number | null
  payment: {
    id: string
    status: PaymentStatus
    dueDate: string
    amountDue: number
    daysOverdue: number | null
  } | null
  consecutiveMissedCheckins: number
  urgency: UrgencyLevel
}
