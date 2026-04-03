import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Shield,
  Users,
  CreditCard,
  Sparkles,
  Phone,
  Check,
  ArrowRight,
} from 'lucide-react'
import { DM_Serif_Display } from 'next/font/google'

const serif = DM_Serif_Display({ subsets: ['latin'], weight: '400' })

const tickerItems = [
  'Court Date Alerts',
  'Forfeiture Countdowns',
  'Defendant Check-ins',
  'Payment Tracking',
  'AI Daily Briefing',
  'Auto-scraped Court Data',
  'Urgency Scoring',
  'Call Logging',
]

const features = [
  {
    icon: Calendar,
    title: 'Court Date Alerts',
    desc: '14-day and 3-day advance warnings so you\'re never caught off guard.',
  },
  {
    icon: Shield,
    title: 'Forfeiture Countdowns',
    desc: '30, 14, and 7-day deadline warnings on every active bond.',
  },
  {
    icon: Users,
    title: 'Defendant Tracking',
    desc: 'Urgency scoring flags defendants who go dark before it becomes a problem.',
  },
  {
    icon: CreditCard,
    title: 'Payment Tracking',
    desc: 'Track installment plans and get alerted when payments go overdue.',
  },
  {
    icon: Sparkles,
    title: 'AI Daily Briefing',
    desc: 'Every morning, Claude summarizes your portfolio and tells you exactly what needs attention.',
  },
  {
    icon: Phone,
    title: 'Call Logging',
    desc: 'One-tap call logging with outcome tracking on every defendant profile.',
  },
]

const pricingFeatures = [
  'Court date monitoring',
  'Forfeiture countdowns',
  'Defendant tracking',
  'Payment plans',
  'AI daily briefing',
  'Call logging',
  'Collin County court scraping',
]

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0f1e3c] flex flex-col text-white">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0f1e3c]/80 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-white text-xl font-bold tracking-tight">BondTrack</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-white/70 text-sm font-medium hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/pricing"
            className="bg-white text-[#0f1e3c] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors active:scale-95 duration-75"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-40 overflow-hidden">
        {/* Radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(99,102,241,0.18) 0%, transparent 70%)',
          }}
        />

        <p className="relative text-indigo-300 text-sm font-semibold tracking-widest uppercase mb-5">
          Built for independent Texas bondsmen
        </p>

        <h1
          className={`${serif.className} relative text-5xl md:text-7xl text-white leading-tight max-w-4xl`}
        >
          Never Miss a Forfeiture Again
        </h1>

        <p className="relative mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
          BondTrack keeps your entire bond portfolio in one place. Court dates, defendant check-ins,
          payment plans, and forfeiture countdowns — all in one dashboard.
        </p>

        <Link
          href="/pricing"
          className="relative mt-10 inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors active:scale-95 duration-75"
        >
          Get Started Free — No Credit Card Required
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── Scrolling Ticker ───────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-white/5 py-5 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap w-max">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6 text-white/70 text-sm font-medium">
              {item}
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 shrink-0" />
            </span>
          ))}
        </div>
      </section>

      {/* ── Problem / Solution ─────────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Most bondsmen are running their portfolio<br className="hidden md:block" /> out of a spreadsheet
          </h2>
          <p className="text-white/50 text-center text-base mb-14 max-w-xl mx-auto">
            That works until it doesn't. And when it stops working, bonds get forfeited.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              'Court dates slip through the cracks',
              'Defendants go dark with no system to catch it',
              'Forfeitures hit because no one was watching the deadline',
            ].map((text) => (
              <div
                key={text}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-white/70 text-base leading-snug"
              >
                <span className="block text-red-400 font-bold text-lg mb-2">✕</span>
                {text}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 text-indigo-300 text-lg font-semibold">
            <ArrowRight className="w-5 h-5 shrink-0" />
            BondTrack fixes all of this automatically
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Everything in one dashboard
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-white font-semibold text-base mb-1.5">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Up and running in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                n: '1',
                title: 'Add your bonds',
                desc: 'Enter defendant info, bond amount, court date, and payment plan.',
              },
              {
                n: '2',
                title: 'BondTrack monitors everything',
                desc: 'Court dates, check-ins, and deadlines tracked automatically in the background.',
              },
              {
                n: '3',
                title: 'Get alerted before anything slips',
                desc: 'Daily AI briefing and in-app notifications keep you ahead of every deadline.',
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-400/60 text-indigo-300 font-bold text-xl flex items-center justify-center shrink-0">
                  {n}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-white/50 mb-10">One plan. Everything included.</p>

          <div className="bg-white/5 border border-white/15 rounded-2xl p-8 text-left">
            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-white">$79</span>
              <span className="text-white/50 text-lg ml-2">/ month</span>
              <p className="text-white/40 text-sm mt-2">No setup fees. Cancel with 30 days notice.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {pricingFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/pricing"
              className="block w-full text-center bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95 duration-75"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-10 mt-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <span className="text-white font-bold text-xl tracking-tight">BondTrack</span>
            <span className="text-white/40 text-sm">Built for Texas bondsmen</span>
            <div className="flex items-center gap-5 text-sm text-white/50">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
            <span>© 2026 BondTrack. All rights reserved.</span>
            <a href="mailto:info@mybondtrack.com" className="hover:text-white/60 transition-colors">
              info@mybondtrack.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
