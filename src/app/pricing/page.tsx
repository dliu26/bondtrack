import Link from 'next/link'
import { Check } from 'lucide-react'
import StartTrialButton from './_components/StartTrialButton'

const pricingFeatures = [
  'Court date monitoring',
  'Forfeiture countdowns',
  'Defendant tracking',
  'Payment plans',
  'AI daily briefing',
  'Call logging',
  'Collin County court scraping',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f1e3c] flex flex-col text-white">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0f1e3c]/80 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white text-xl font-bold tracking-tight hover:text-white/90 transition-colors">
          BondTrack
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-white/70 text-sm font-medium hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-white/50 text-lg max-w-md">
          Everything you need to manage your bail bond portfolio.
        </p>
      </section>

      {/* ── Pricing Card ─────────────────────────────────────────────────── */}
      <section className="flex-1 flex items-start justify-center px-6 pb-24">
        <div className="w-full max-w-md bg-[#1a2d4f] border border-white/10 rounded-2xl shadow-xl p-8">
          {/* Price */}
          <div className="text-center mb-2">
            <span className="text-6xl font-bold text-white">$79</span>
            <span className="text-white/50 text-xl ml-2">/ month</span>
          </div>

          {/* Trial callout */}
          <p className="text-center text-green-400 text-sm font-medium mb-8">
            30-day free trial, then $79/month. Cancel anytime with 30 days notice.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mb-8">
            {pricingFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/70 text-sm">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <StartTrialButton />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <span>© 2026 BondTrack. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
