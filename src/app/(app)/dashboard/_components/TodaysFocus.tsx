'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  ChevronDown, ChevronUp, Check, AlertCircle, Clock, CheckCircle2,
  FileText, Flag,
} from 'lucide-react'
import clsx from 'clsx'
import PhoneButton from '@/components/PhoneButton'
import { toast } from '@/lib/toast'
import { todayKeyCT } from '@/lib/date'
import { markCheckinConfirmed, logNote, createDashboardNotification } from '@/app/(app)/defendants/[id]/actions'
import type { ProcessedBond } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FocusItem {
  key: string
  bondId: string
  defendantId: string
  defendantName: string
  defendantPhone: string | null
  issue: string
  urgency: 'red' | 'yellow'
  action: {
    type: 'mark_checkin' | 'confirm_ready' | 'call_cosigner' | 'flag_missing'
    label: string
    phone?: string
    phoneName?: string
    // confirm_ready: notification message to record (does NOT touch notes)
    notificationMessage?: string
  }
}

// ── Build focus items from bonds ───────────────────────────────────────────────

function buildFocusItems(bonds: ProcessedBond[]): FocusItem[] {
  const items: FocusItem[] = []

  for (const bond of bonds) {
    const def = bond.defendant
    const name = `${def.firstName} ${def.lastName}`
    const phone = def.phone ?? null

    // Forfeiture warning (always red)
    if (bond.daysToForfeiture !== null && bond.daysToForfeiture <= 30) {
      const d = bond.daysToForfeiture
      items.push({
        key: `${bond.id}_forfeiture`,
        bondId: bond.id,
        defendantId: def.id,
        defendantName: name,
        defendantPhone: phone,
        issue: d <= 0 ? 'Forfeiture deadline has passed!' : `Forfeiture deadline in ${d} day${d === 1 ? '' : 's'}`,
        urgency: 'red',
        action: { type: 'confirm_ready', label: 'Confirm Reviewed', notificationMessage: `Forfeiture deadline reviewed for ${name}` },
      })
    }

    // Court date upcoming
    if (bond.daysToCourtDate !== null && bond.daysToCourtDate <= 14) {
      const d = bond.daysToCourtDate
      const urgency: 'red' | 'yellow' = d <= 3 ? 'red' : 'yellow'
      const issue =
        d === 0 ? 'Court date is TODAY' :
        d < 0 ? `Court date was ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago` :
        `Court date in ${d} day${d === 1 ? '' : 's'}`
      const courtInfo = bond.nextCourtDate
        ? `court on ${format(parseISO(bond.nextCourtDate.date), 'MMM d')}`
        : 'upcoming court date'
      items.push({
        key: `${bond.id}_court`,
        bondId: bond.id,
        defendantId: def.id,
        defendantName: name,
        defendantPhone: phone,
        issue,
        urgency,
        action: { type: 'confirm_ready', label: 'Confirm Ready', notificationMessage: `${name} confirmed ready for ${courtInfo}` },
      })
    }

    // Missed check-ins
    if (bond.consecutiveMissedCheckins >= 1) {
      const urgency: 'red' | 'yellow' = bond.consecutiveMissedCheckins >= 2 ? 'red' : 'yellow'
      const issue =
        bond.consecutiveMissedCheckins >= 2
          ? `Missed ${bond.consecutiveMissedCheckins} check-ins in a row`
          : 'Missed last check-in'
      items.push({
        key: `${bond.id}_checkin`,
        bondId: bond.id,
        defendantId: def.id,
        defendantName: name,
        defendantPhone: phone,
        issue,
        urgency,
        action:
          bond.consecutiveMissedCheckins >= 2
            ? { type: 'flag_missing', label: 'Flag as Missing' }
            : { type: 'mark_checkin', label: 'Mark Checked In' },
      })
    }

    // Overdue payment
    if (bond.payment?.status === 'overdue' && bond.payment.daysOverdue !== null && bond.payment.daysOverdue >= 1) {
      const d = bond.payment.daysOverdue
      const urgency: 'red' | 'yellow' = d >= 14 ? 'red' : 'yellow'
      const amtStr = `$${bond.payment.amountDue.toLocaleString()}`
      const cosignerPhone = bond.cosignerPhone ?? null
      const cosignerName = bond.cosignerName ?? null
      items.push({
        key: `${bond.id}_payment`,
        bondId: bond.id,
        defendantId: def.id,
        defendantName: name,
        defendantPhone: phone,
        issue: `Payment overdue ${amtStr} — ${d} day${d === 1 ? '' : 's'} late`,
        urgency,
        action: cosignerPhone
          ? { type: 'call_cosigner', label: 'Call Co-Signer', phone: cosignerPhone, phoneName: cosignerName ?? 'Co-Signer' }
          : { type: 'confirm_ready', label: 'Confirm Reviewed', notificationMessage: `Overdue payment reviewed for ${name}` },
      })
    }
  }

  return items
}

// ── Local storage ─────────────────────────────────────────────────────────────

function loadHandled(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`handled_${todayKeyCT()}`)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {}
  return new Set()
}

function saveHandled(keys: Set<string>) {
  try {
    localStorage.setItem(`handled_${todayKeyCT()}`, JSON.stringify([...keys]))
  } catch {}
}

// ── Action button — logs a specific action to the server ───────────────────────
// Visually: primary solid-color button with icon. Purpose: record what you did.

function ItemActionButton({ item, onDone }: { item: FocusItem; onDone: () => void }) {
  const [busy, setBusy] = useState(false)

  if (item.action.type === 'call_cosigner' && item.action.phone) {
    return (
      <PhoneButton
        phone={item.action.phone}
        calledName={item.action.phoneName ?? 'Co-Signer'}
        defendantId={item.defendantId}
        label={item.action.label}
        variant="gray"
      />
    )
  }

  const Icon =
    item.action.type === 'flag_missing' ? Flag :
    item.action.type === 'mark_checkin' ? CheckCircle2 :
    FileText

  async function handleClick() {
    setBusy(true)
    let result: { error?: string } | undefined

    if (item.action.type === 'mark_checkin') {
      result = await markCheckinConfirmed(item.defendantId)
      if (!result?.error) toast('Check-in recorded.', 'success')
    } else if (item.action.type === 'confirm_ready') {
      const msg = item.action.notificationMessage ?? 'Reviewed'
      result = await createDashboardNotification(item.bondId, msg)
      if (!result?.error) toast('Confirmation logged.', 'success')
    } else if (item.action.type === 'flag_missing') {
      result = await logNote(item.defendantId, '⚠️ Flagged as potential skip — follow up immediately')
      if (!result?.error) toast('Defendant flagged.', 'success')
    }

    setBusy(false)
    if (result?.error) {
      toast(result.error, 'error')
    } else {
      onDone()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={clsx(
        'shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px]',
        'transition-colors active:scale-95 duration-75 disabled:opacity-40 whitespace-nowrap',
        item.urgency === 'red'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-[#0f1e3c] text-white hover:bg-[#1a2f5a]'
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {busy ? '…' : item.action.label}
    </button>
  )
}

// ── Done checkbox — UI-only toggle to mark item as handled for today ───────────
// Visually: outlined toggle with square checkbox + "Done" label. No server call.

function DoneCheckbox({
  handled,
  urgency,
  onToggle,
}: {
  handled: boolean
  urgency: 'red' | 'yellow'
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={handled ? 'Mark as not done' : 'Mark as done for today'}
      className={clsx(
        'shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl min-h-[44px] transition-colors',
        handled
          ? 'bg-green-50 border border-green-200 text-green-700'
          : clsx(
              'border text-gray-400 hover:text-green-600',
              urgency === 'red'
                ? 'border-red-200 hover:border-green-300 hover:bg-green-50'
                : 'border-yellow-200 hover:border-green-300 hover:bg-green-50'
            )
      )}
    >
      <div className={clsx(
        'w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0',
        handled ? 'bg-green-500 border-green-500' : 'border-current'
      )}>
        {handled && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className="hidden sm:inline">Done</span>
    </button>
  )
}

// ── Focus item row ─────────────────────────────────────────────────────────────

function FocusItemRow({
  item,
  handled,
  onHandle,
}: {
  item: FocusItem
  handled: boolean
  onHandle: (key: string) => void
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0',
        handled && 'opacity-50'
      )}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/defendants/${item.defendantId}`}
            className="font-bold text-gray-900 text-base hover:underline"
          >
            {item.defendantName}
          </Link>
          {item.defendantPhone && (
            <PhoneButton
              phone={item.defendantPhone}
              calledName={item.defendantName}
              defendantId={item.defendantId}
            />
          )}
        </div>
        <p className={clsx(
          'text-base mt-0.5',
          item.urgency === 'red' ? 'text-red-700' : 'text-yellow-700'
        )}>
          {item.issue}
        </p>
      </div>

      {/* Right side: action button + done checkbox */}
      <div className="flex items-center gap-2 shrink-0">
        {!handled && (
          <ItemActionButton item={item} onDone={() => onHandle(item.key)} />
        )}
        <DoneCheckbox
          handled={handled}
          urgency={item.urgency}
          onToggle={() => onHandle(item.key)}
        />
      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  color,
  icon: Icon,
}: {
  label: string
  count: number
  color: string
  icon: React.ElementType
}) {
  return (
    <div className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-t-xl', color)}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-bold text-base">{label}</span>
      <span className="ml-1 text-sm font-semibold opacity-70">({count})</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TodaysFocus({ bonds }: { bonds: ProcessedBond[] }) {
  const [handledKeys, setHandledKeys] = useState<Set<string>>(new Set())
  const [greenOpen, setGreenOpen] = useState(false)
  const [handledOpen, setHandledOpen] = useState(false)

  useEffect(() => {
    setHandledKeys(loadHandled())
  }, [])

  function handleItem(key: string) {
    setHandledKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      saveHandled(next)
      return next
    })
  }

  const allItems = buildFocusItems(bonds)
  const redItems = allItems.filter((i) => i.urgency === 'red')
  const yellowItems = allItems.filter((i) => i.urgency === 'yellow')

  const activeRedItems = redItems.filter((i) => !handledKeys.has(i.key))
  const activeYellowItems = yellowItems.filter((i) => !handledKeys.has(i.key))
  const handledItems = allItems.filter((i) => handledKeys.has(i.key))

  const focusedBondIds = new Set(allItems.map((i) => i.bondId))
  const onTrackBonds = bonds
    .filter((b) => !focusedBondIds.has(b.id) || b.urgency === 'green')
    .filter((b, idx, arr) => arr.findIndex((x) => x.id === b.id) === idx)
    .filter((b) => b.urgency === 'green')

  const totalActions = activeRedItems.length + activeYellowItems.length

  if (bonds.length === 0) return null

  if (totalActions === 0 && handledItems.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
        <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
        <div>
          <p className="text-lg font-bold text-green-800">All clear today.</p>
          <p className="text-green-700 text-base">No urgent items. Your portfolio is on track.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-3">
      <h2 className="text-xl font-bold text-gray-900">Today&apos;s Focus</h2>

      {/* Needs Action Today — red */}
      {activeRedItems.length > 0 && (
        <div className="rounded-xl border border-red-200 overflow-hidden">
          <SectionHeader
            label="Needs Action Today"
            count={activeRedItems.length}
            color="bg-red-50 text-red-800"
            icon={AlertCircle}
          />
          <div className="bg-white divide-y divide-gray-100 px-4">
            {activeRedItems.map((item) => (
              <FocusItemRow
                key={item.key}
                item={item}
                handled={handledKeys.has(item.key)}
                onHandle={handleItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* This Week — yellow */}
      {activeYellowItems.length > 0 && (
        <div className="rounded-xl border border-yellow-200 overflow-hidden">
          <SectionHeader
            label="This Week"
            count={activeYellowItems.length}
            color="bg-yellow-50 text-yellow-800"
            icon={Clock}
          />
          <div className="bg-white divide-y divide-gray-100 px-4">
            {activeYellowItems.map((item) => (
              <FocusItemRow
                key={item.key}
                item={item}
                handled={handledKeys.has(item.key)}
                onHandle={handleItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* On Track — green, collapsed by default */}
      {onTrackBonds.length > 0 && (
        <div className="rounded-xl border border-green-200 overflow-hidden">
          <button
            onClick={() => setGreenOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-800 hover:bg-green-100 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold text-base flex-1 text-left">On Track</span>
            <span className="text-sm font-semibold opacity-70 mr-2">({onTrackBonds.length})</span>
            {greenOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {greenOpen && (
            <div className="bg-white divide-y divide-gray-100 px-4">
              {onTrackBonds.map((bond) => (
                <div key={bond.id} className="flex items-center gap-3 py-3.5">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <Link
                    href={`/defendants/${bond.defendant.id}`}
                    className="flex-1 font-semibold text-gray-700 hover:underline"
                  >
                    {bond.defendant.firstName} {bond.defendant.lastName}
                  </Link>
                  <span className="text-sm text-gray-400">${bond.bondAmount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Handled Today — auto-collapsed */}
      {handledItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setHandledOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-base flex-1 text-left">Handled Today</span>
            <span className="text-sm font-semibold opacity-70 mr-2">({handledItems.length})</span>
            {handledOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {handledOpen && (
            <div className="bg-white divide-y divide-gray-100 px-4">
              {handledItems.map((item) => (
                <FocusItemRow
                  key={item.key}
                  item={item}
                  handled={true}
                  onHandle={handleItem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
