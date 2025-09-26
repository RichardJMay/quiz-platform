'use client'

import PageLayout from '@/components/layout/PageLayout'

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Notice</h1>
        <p className="text-gray-600 mb-8">Effective: 20 September 2025</p>

        <div className="space-y-6 text-gray-800 leading-relaxed">
          <p>
            This is a short privacy notice for the <strong>optibl</strong> pilot. We’re not selling anything during
            this pilot and we keep data collection to the minimum needed to run the site.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-2">What we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Your account details (email and optional name) via Supabase Auth.</li>
              <li>Your quiz activity (attempts, scores, timing, and responses) to show your progress.</li>
              <li>Basic technical logs needed to keep the service running (e.g., error logs).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">What we do <em>not</em> collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>No payment details (there are no paid features in this pilot).</li>
              <li>No advertising or third-party tracking cookies.</li>
              <li>No analytics tools (e.g., Google Analytics) during the pilot.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            <p>
              We use essential cookies only (for sign-in/session). You can block cookies in your browser, but the site
              may not work while signed in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How we use your data</h2>
            <p>
              To operate the site, show your progress, improve reliability, and respond to support requests. We do not
              sell your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Retention</h2>
            <p>
              Account and quiz data are kept while you have an account. You can ask us to delete your account and data
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Questions or deletion requests: <a className="text-blue-600 hover:underline" href="mailto:richard.may@southwales.ac.uk">richard.may@southwales.ac.uk</a>
              {/* TODO: replace with your preferred email */}
            </p>
          </section>

          <p className="text-sm text-gray-500">
            
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
