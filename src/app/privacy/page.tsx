import Link from 'next/link'
import ContactForm from './ContactForm'

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
          <p className="text-sm text-gray-500 mb-10">Last updated: March 2026</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <p>
              BondTrack Software (&lsquo;we&rsquo;, &lsquo;us&rsquo;, &lsquo;our&rsquo;) operates{' '}
              <span className="font-medium">bondtrack-ochre.vercel.app</span>. This page explains
              how we handle your data.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Data we collect</h2>
              <p>
                Name, email address, and bond management data you enter including defendant
                information, court dates, and payment records.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">How we use your data</h2>
              <p>
                Solely to provide the BondTrack service. We do not sell, share, or disclose your
                data to any third party.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Data storage</h2>
              <p>
                Your data is stored securely using Supabase. Each account can only access its own
                data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Beta disclaimer</h2>
              <p>
                BondTrack is currently in beta. It is a workflow management tool only. You are
                solely responsible for verifying all court dates, monitoring defendants, and meeting
                all legal obligations. BondTrack assumes no liability for missed court appearances,
                bond forfeitures, or any legal or financial consequences arising from use of this
                platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Data deletion</h2>
              <p>
                You can delete your account and all associated data at any time from the Settings
                page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Privacy questions</h2>
              <p className="mb-6">
                For any privacy questions, use the contact form on this page.
              </p>
              <ContactForm />
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-2xl mx-auto text-sm text-gray-500">
          <p>© 2026 BondTrack Software. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
