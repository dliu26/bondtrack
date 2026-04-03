'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import {
  saveProfile,
  saveNotifications,
  saveDefaults,
  changePassword,
  deleteAccount,
} from './actions'
import { toast } from '@/lib/toast'
import type { BondsmanSettings } from './actions'

// ── Small primitives ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a2d4f] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 bg-white/5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
}

const inputBase = 'w-full px-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'

function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  className,
}: {
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      disabled={disabled}
      className={clsx(inputBase, className)}
    />
  )
}

function SaveButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors active:scale-95 duration-75 disabled:opacity-50 min-h-[44px]"
    >
      <Check className="w-4 h-4" />
      {busy ? 'Saving…' : 'Save Changes'}
    </button>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-base font-medium text-white">{label}</p>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0',
          checked ? 'bg-blue-600' : 'bg-white/20'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ settings, email }: { settings: BondsmanSettings | null; email: string }) {
  const [name, setName] = useState(settings?.name ?? '')
  const [phone, setPhone] = useState(settings?.phone ?? '')
  const [agencyName, setAgencyName] = useState(settings?.agency_name ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSave() {
    setErrors({})
    setBusy(true)
    const result = await saveProfile({ name, phone, agencyName })
    setBusy(false)
    if (result.error) {
      if (result.error.includes('Phone')) setErrors({ phone: result.error })
      else toast(result.error, 'error')
    } else {
      toast('Profile saved.')
    }
  }

  return (
    <Section title="Profile">
      <FieldGroup label="Full Name">
        <TextInput value={name} onChange={setName} placeholder="John Smith" />
      </FieldGroup>
      <FieldGroup label="Email">
        <TextInput value={email} disabled />
      </FieldGroup>
      <FieldGroup label="Phone Number" error={errors.phone}>
        <TextInput
          value={phone}
          onChange={setPhone}
          placeholder="(214) 555-0100"
          className={errors.phone ? 'border-red-500/50' : ''}
        />
      </FieldGroup>
      <FieldGroup label="Agency Name">
        <TextInput value={agencyName} onChange={setAgencyName} placeholder="Smith Bail Bonds" />
      </FieldGroup>
      <SaveButton onClick={handleSave} busy={busy} />
    </Section>
  )
}

// ── Notifications section ─────────────────────────────────────────────────────

function NotificationsSection({ settings }: { settings: BondsmanSettings | null }) {
  const [showDailyList, setShowDailyList] = useState(settings?.show_daily_list ?? true)
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    const result = await saveNotifications({ showDailyList })
    setBusy(false)
    if (result.error) toast(result.error, 'error')
    else toast('Settings saved.')
  }

  return (
    <Section title="Daily Reminders">
      <p className="text-sm text-slate-400 -mt-1">
        Control what appears on your dashboard each morning.
      </p>
      <div className="divide-y divide-white/10">
        <Toggle
          checked={showDailyList}
          onChange={setShowDailyList}
          label="Show Today's Focus on dashboard"
          description="Displays a daily action checklist at the top of your dashboard"
        />
      </div>
      <SaveButton onClick={handleSave} busy={busy} />
    </Section>
  )
}

// ── Defaults section ──────────────────────────────────────────────────────────

function DefaultsSection({ settings }: { settings: BondsmanSettings | null }) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>(
    settings?.default_checkin_frequency ?? 'weekly'
  )
  const [county, setCounty] = useState(settings?.default_county ?? '')
  const [court, setCourt] = useState(settings?.default_court ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    const result = await saveDefaults({ checkinFrequency: frequency, county, court })
    setBusy(false)
    if (result.error) toast(result.error, 'error')
    else toast('Default settings saved.')
  }

  return (
    <Section title="Default Bond Settings">
      <p className="text-sm text-slate-400 -mt-1">These values auto-fill when adding a new bond.</p>
      <FieldGroup label="Default Check-in Frequency">
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          className={inputBase}
        >
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
          <option value="custom">Custom</option>
        </select>
      </FieldGroup>
      <FieldGroup label="Default County">
        <TextInput value={county} onChange={setCounty} placeholder="Collin" />
      </FieldGroup>
      <FieldGroup label="Default Court">
        <TextInput value={court} onChange={setCourt} placeholder="219th District Court" />
      </FieldGroup>
      <SaveButton onClick={handleSave} busy={busy} />
    </Section>
  )
}

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection() {
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess(false)
    setPasswordBusy(true)
    const result = await changePassword({ newPassword, confirmPassword })
    setPasswordBusy(false)
    if (result.error) {
      setPasswordError(result.error)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    setDeleteBusy(true)
    const result = await deleteAccount(deleteConfirm)
    setDeleteBusy(false)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="space-y-4">
      {/* Change password */}
      <Section title="Change Password">
        <FieldGroup label="New Password" error={passwordError}>
          <div className="relative">
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FieldGroup>
        <FieldGroup label="Confirm New Password">
          <TextInput
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Same as above"
          />
        </FieldGroup>
        {passwordSuccess && (
          <p className="text-green-400 text-sm bg-green-900/30 px-3 py-2 rounded-lg">
            Password changed successfully.
          </p>
        )}
        <button
          onClick={handleChangePassword}
          disabled={passwordBusy || !newPassword || !confirmPassword}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors active:scale-95 duration-75 disabled:opacity-50 min-h-[44px]"
        >
          {passwordBusy ? 'Updating…' : 'Update Password'}
        </button>
      </Section>

      {/* Danger zone */}
      <div className="bg-[#1a2d4f] rounded-2xl border border-red-500/30 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-red-500/20 bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-400">
            Deleting your account is permanent. All bonds, defendants, and data will be removed immediately.
          </p>
          <FieldGroup label="Type DELETE to confirm" error={deleteError}>
            <TextInput
              value={deleteConfirm}
              onChange={setDeleteConfirm}
              placeholder="DELETE"
              className={deleteError ? 'border-red-500/50' : ''}
            />
          </FieldGroup>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteBusy || deleteConfirm !== 'DELETE'}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-red-700 transition-colors active:scale-95 duration-75 disabled:opacity-40 min-h-[44px]"
          >
            {deleteBusy ? 'Deleting…' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SettingsForm({
  settings,
  email,
}: {
  settings: BondsmanSettings | null
  email: string
}) {
  return (
    <div className="space-y-6">
      <ProfileSection settings={settings} email={email} />
      <NotificationsSection settings={settings} />
      <DefaultsSection settings={settings} />
      <AccountSection />
    </div>
  )
}
