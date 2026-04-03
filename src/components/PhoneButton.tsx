'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone } from 'lucide-react'
import clsx from 'clsx'
import { logCallOutcome } from '@/app/(app)/calls/actions'
import { toast } from '@/lib/toast'

interface PhoneButtonProps {
  phone: string
  calledName: string
  defendantId: string
  label?: string
  variant?: 'green' | 'gray'
  className?: string
}

interface PendingCall {
  defendantId: string
  phone: string
  calledName: string
}

export default function PhoneButton({
  phone,
  calledName,
  defendantId,
  label,
  variant = 'green',
  className,
}: PhoneButtonProps) {
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const pendingRef = useRef<PendingCall | null>(null)

  useEffect(() => {
    pendingRef.current = pendingCall
  }, [pendingCall])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && pendingRef.current) {
        setShowPrompt(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  function handleCallClick() {
    setPendingCall({ defendantId, phone, calledName })
  }

  async function handleOutcome(outcome: 'reached' | 'no_answer' | 'voicemail') {
    const call = pendingRef.current
    if (!call) return
    setShowPrompt(false)
    setPendingCall(null)
    pendingRef.current = null
    const result = await logCallOutcome({
      defendantId: call.defendantId,
      phone: call.phone,
      calledName: call.calledName,
      outcome,
    })
    if (result?.error) {
      toast('Could not save call — ' + result.error, 'error')
    } else {
      const label =
        outcome === 'reached' ? 'Reached them ✓' :
        outcome === 'no_answer' ? 'No answer logged' :
        'Voicemail logged'
      toast(label)
    }
  }

  function dismiss() {
    setShowPrompt(false)
    setPendingCall(null)
    pendingRef.current = null
  }

  const digits = phone.replace(/\D/g, '')
  const formatted = digits.replace(/^1?(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || phone

  return (
    <>
      <a
        href={`tel:${digits}`}
        onClick={handleCallClick}
        className={clsx(
          'inline-flex items-center gap-1.5 font-medium transition-colors active:scale-95 duration-75',
          label
            ? 'px-4 py-2.5 rounded-xl min-h-[44px] text-base'
            : 'w-10 h-10 rounded-full justify-center shrink-0',
          variant === 'green'
            ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
            : 'bg-white/10 text-slate-300 hover:bg-white/20',
          className
        )}
      >
        <Phone className="w-4 h-4 shrink-0" />
        {label && <span>{label}</span>}
      </a>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#1a2d4f] rounded-2xl shadow-xl border border-white/10 w-full max-w-sm p-6">
            <p className="text-xl font-bold text-white mb-1">How did it go?</p>
            <p className="text-slate-400 text-base mb-6">
              Call with <span className="font-medium text-white">{pendingCall?.calledName}</span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleOutcome('reached')}
                className="w-full py-4 rounded-xl bg-green-900/40 text-green-300 font-bold text-lg hover:bg-green-900/60 transition-colors active:scale-95 duration-75"
              >
                Reached them ✓
              </button>
              <button
                onClick={() => handleOutcome('no_answer')}
                className="w-full py-4 rounded-xl bg-white/10 text-slate-300 font-bold text-lg hover:bg-white/20 transition-colors active:scale-95 duration-75"
              >
                No answer
              </button>
              <button
                onClick={() => handleOutcome('voicemail')}
                className="w-full py-4 rounded-xl bg-white/10 text-slate-300 font-bold text-lg hover:bg-white/20 transition-colors active:scale-95 duration-75"
              >
                Left voicemail
              </button>
            </div>
            <button
              onClick={dismiss}
              className="w-full mt-4 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip — don&apos;t log this call
            </button>
          </div>
        </div>
      )}
    </>
  )
}
