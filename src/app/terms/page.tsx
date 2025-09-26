// app/terms/page.tsx
'use client'

import PageLayout from '@/components/layout/PageLayout'

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
        <p className="text-gray-600 mb-8">Effective: 20 September 2025</p>

        <div className="space-y-6 text-gray-800 leading-relaxed">
          <p>
            These short terms apply to the <strong>optibl</strong> pilot. The service is provided free of charge for testing and feedback.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-2">Use of the service</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Don’t disrupt, reverse engineer, or misuse the site.</li>
              <li>Don’t upload unlawful or harmful content.</li>
              <li>We may change or suspend the pilot at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Your data</h2>
            <p>
              See our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Notice</a> for how we handle data during the pilot. You can request deletion at any time by email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes</h2>
            <p>
              We may update these terms during the pilot and will post the latest version here. Continued use means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Questions: <a className="text-blue-600 hover:underline" href="mailto:richard.may@southwales.ac.uk">richard.may@southwales.ac.uk</a>
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
