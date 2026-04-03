import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — BondTrack',
}

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-10">Last Updated: April 2, 2026</p>

          <div className="space-y-7 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">What BondTrack is</h2>
              <p>
                BondTrack is a supplementary portfolio management tool for licensed bail bondsmen. It is not a
                substitute for independently verifying court dates, deadlines, or any legal obligation. It does
                not provide legal or professional advice of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">No guarantees</h2>
              <p>
                The platform is provided <span className="italic">as-is</span>. We make no guarantees about
                uptime, notification delivery, or the accuracy of any data — including court dates pulled from
                public portals. Systems fail. Notifications get missed. Do not rely on BondTrack as your only
                safeguard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Your responsibility</h2>
              <p>
                You are solely responsible for independently verifying all court dates, deadlines, and defendant
                status through official court sources. BondTrack is a convenience tool. The consequences of
                missed court dates or bond forfeitures are yours, not ours.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Court data warning</h2>
              <p>
                Some court dates are pulled automatically from public court portals. That data may be
                incomplete, delayed, or wrong. Always verify any auto-scraped date directly with the court
                before taking action.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Limitation of liability</h2>
              <p className="uppercase text-sm leading-relaxed">
                Our total liability for any claim arising from your use of BondTrack is capped at the lesser
                of $100 or the fees you paid in the three months before the claim. We are not liable for missed
                court dates, bond forfeitures, lost revenue, or any other financial or legal losses — even if
                we were advised such losses were possible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Indemnification</h2>
              <p>
                You agree to hold BondTrack and its owners harmless from any claims, costs, or damages
                (including attorney&rsquo;s fees) that arise from your use of the platform or your violation
                of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Cancellation</h2>
              <p>
                To cancel, email us at least 30 days before your next billing date. No refunds for unused
                periods. Export your data before you cancel — we delete everything within 30 days of account
                termination and cannot recover it after that.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Disputes</h2>
              <p>
                Any dispute arising from these terms or your use of BondTrack will be resolved by binding
                arbitration in Travis County, Texas, under AAA rules. You waive the right to a jury trial and
                the right to participate in a class action.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Governing law</h2>
              <p>These terms are governed by the laws of the State of Texas.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Changes</h2>
              <p>
                We may update these terms at any time. Continued use of BondTrack after a change means you
                accept the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Contact</h2>
              <p>
                Questions?{' '}
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
