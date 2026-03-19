import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Bell, Shield } from 'lucide-react'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="bg-[#0f1e3c] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white text-xl font-bold tracking-tight">BondTrack</Link>
        <Link
          href="/login"
          className="text-white text-sm font-medium hover:text-gray-300 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-36">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-3xl">
          Never Miss a Forfeiture Again
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
          BondTrack keeps your entire bond portfolio in one place. Court dates, defendant check-ins,
          payment plans, and forfeiture countdowns — all in one dashboard.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-block bg-[#0f1e3c] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75"
        >
          Get Started Free — No Credit Card Required
        </Link>
      </section>

      {/* Feature cards */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="w-12 h-12 bg-[#0f1e3c] rounded-xl flex items-center justify-center mb-5">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Court Date Alerts</h3>
            <p className="text-gray-600 leading-relaxed">
              Get notified the moment a court date changes.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="w-12 h-12 bg-[#0f1e3c] rounded-xl flex items-center justify-center mb-5">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Defendant Tracking</h3>
            <p className="text-gray-600 leading-relaxed">
              Automated check-ins flag defendants who go dark.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="w-12 h-12 bg-[#0f1e3c] rounded-xl flex items-center justify-center mb-5">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Forfeiture Countdowns</h3>
            <p className="text-gray-600 leading-relaxed">
              Never lose track of your 90-day deadline.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-800 transition-colors">© 2026 BondTrack Software. All rights reserved.</Link>
          <Link href="/privacy" className="hover:text-gray-800 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
