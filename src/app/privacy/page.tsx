import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — BondTrack',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="bg-[#0f1e3c] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white text-xl font-bold tracking-tight">
          BondTrack
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/" className="text-white/70 text-sm font-medium hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <Link href="/login" className="text-white text-sm font-medium hover:text-gray-300 transition-colors">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">Last Updated: April 2, 2026</p>

          <div className="space-y-7 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">What we collect</h2>
              <p>
                Your account info (name, email, agency name) and the bond and defendant data you enter into
                the platform. We don&rsquo;t collect data directly from defendants — that information comes
                from you.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">How we use it</h2>
              <p>
                To run BondTrack. We don&rsquo;t sell your data, share it with advertisers, or use it for
                anything other than operating the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Your data</h2>
              <p>
                You can request deletion of your account and all associated data at any time by emailing{' '}
                <a href="mailto:info@mybondtrack.com" className="text-[#0f1e3c] font-medium hover:underline">
                  info@mybondtrack.com
                </a>
                . We will process deletion requests within 30 days. We use Supabase for storage, Vercel for
                hosting, and AI to generate your daily briefing summaries.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Contact</h2>
              <p>
                Questions about this policy? Email{' '}
                <a href="mailto:info@mybondtrack.com" className="text-[#0f1e3c] font-medium hover:underline">
                  info@mybondtrack.com
                </a>
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <p>© 2026 BondTrack Software. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-800 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
