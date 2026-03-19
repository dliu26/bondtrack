'use client'

import { useState } from 'react'
import { signIn, signUp } from './actions'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0f1e3c] mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#0f1e3c]">BondTrack</h1>
          <p className="text-gray-500 mt-1 text-lg">Bail Bond Portfolio Manager</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f1e3c] text-white text-lg font-semibold py-3.5 rounded-xl hover:bg-[#1a2f5a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'signin' ? (
              <p className="text-base text-gray-600">
                New user?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="text-[#0f1e3c] font-semibold hover:underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-base text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  className="text-[#0f1e3c] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Texas Bail Bond Portfolio Management
        </p>
      </div>
    </div>
  )
}
