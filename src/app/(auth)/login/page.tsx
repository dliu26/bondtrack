'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn, signUp } from './actions'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const action = mode === 'signin' ? signIn : signUp
    const result = await action(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1e3c] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">BondTrack</h1>
          <p className="text-slate-400 mt-1 text-lg">Bail Bond Portfolio Manager</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a2d4f] rounded-2xl shadow-xl border border-white/10 p-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your free account'}
          </h2>
          {mode === 'signup' && (
            <p className="text-base text-slate-400 mb-6">No credit card required. Takes 30 seconds.</p>
          )}
          {mode === 'signin' && <div className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-base font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 text-lg bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 text-lg bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {mode === 'signup' && (
              <div className="flex items-start gap-3">
                <input
                  id="agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 accent-blue-400 shrink-0 cursor-pointer"
                />
                <label htmlFor="agree" className="text-sm text-slate-400 leading-snug cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-blue-400 font-semibold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-blue-400 font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-base">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !agreed)}
              className="w-full bg-blue-600 text-white text-lg font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Free Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'signin' ? (
              <p className="text-base text-slate-400">
                New user?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="text-blue-400 font-semibold hover:underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-base text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  className="text-blue-400 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Texas Bail Bond Portfolio Management
        </p>
      </div>
    </div>
  )
}
