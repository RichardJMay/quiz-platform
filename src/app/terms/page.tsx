'use client'

import { useRouter } from 'next/navigation'
import PageLayout from '@/components/layout/PageLayout'

export default function TermsOfService() {
  const router = useRouter()
  
  return (
    <PageLayout>
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          <p className="text-gray-600 mb-8">
            <strong>Last updated:</strong> August 12, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing and using optibl (&ldquo;Service&rdquo;, &ldquo;Platform&rdquo;), operated by Dr Richard May (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
            </p>
            <p className="text-gray-700 mb-6">
              If you do not agree to these Terms, please do not use our Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">optibl provides:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Educational Quizzes:</strong> Interactive assessments in behavior analysis and related fields</li>
              <li><strong>Progress Tracking:</strong> Advanced analytics to monitor learning fluency and improvement</li>
              <li><strong>Performance Metrics:</strong> Detailed reporting on quiz completion and accuracy</li>
              <li><strong>Professional Content:</strong> Academically-designed materials by Dr May (PhD BCBA-D)</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. User Accounts and Registration</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-700 mb-4">To access certain features, you must:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Be at least 13 years old (16 in the EU)</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.2 Account Responsibilities</h3>
            <p className="text-gray-700 mb-6">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Payment Terms</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 Pricing and Payment</h3>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Some quizzes are free; premium content requires payment</li>
              <li>All prices are displayed in USD unless otherwise stated</li>
              <li>Payment processing is handled securely by Stripe</li>
              <li>You authorize us to charge your chosen payment method</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 Refund Policy</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 mb-2"><strong>UK/EU Users:</strong></p>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>14-day cooling off period under Consumer Rights Act 2015 / Consumer Rights Directive</li>
                <li>Right to cancel digital content before download/access begins</li>
                <li>No refund available once you begin taking a quiz (service has commenced)</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 mb-2"><strong>International Users:</strong></p>
              <ul className="list-disc list-inside text-amber-700 space-y-1">
                <li>Refunds considered on a case-by-case basis within 7 days of purchase</li>
                <li>No refund available once you access/begin the quiz content</li>
                <li>Technical issues will be resolved or refunded appropriately</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Share quiz content, questions, or answers with others</li>
              <li>Use automated systems to take quizzes or create accounts</li>
              <li>Reverse engineer or attempt to extract quiz databases</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload malicious code or attempt to compromise the platform</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.1 Our Content</h3>
            <p className="text-gray-700 mb-6">
              All quiz content, questions, explanations, analytics, and educational materials are the intellectual property of Dr Richard May and are protected by copyright law. You may not reproduce, distribute, or create derivative works without explicit written permission.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.2 Your Data</h3>
            <p className="text-gray-700 mb-6">
              You retain ownership of your personal information and quiz responses. We use this data solely to provide our service as described in our Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-6">
              Your privacy is important to us. Our collection and use of personal information is governed by our{" "}
              <button 
                onClick={() => router.push('/privacy')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Privacy Policy
              </button>
              , which forms part of these Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Service Availability</h2>
            <p className="text-gray-700 mb-6">
              While we strive for continuous availability, we do not guarantee uninterrupted access. We may temporarily suspend the service for maintenance, updates, or technical issues. We will provide reasonable notice when possible.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 mb-2"><strong>UK Users:</strong></p>
              <p className="text-yellow-700 text-sm">
                Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or other liability that cannot be excluded under UK law.
              </p>
            </div>
            <p className="text-gray-700 mb-6">
              Subject to the above, our liability is limited to the amount you paid for the specific quiz or service that gave rise to the claim. We are not liable for indirect, consequential, or punitive damages.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Educational Purpose</h2>
            <p className="text-gray-700 mb-6">
              Our quizzes are designed for educational and professional development purposes. They should not be considered as:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Professional certification or accreditation</li>
              <li>Substitute for formal education or training</li>
              <li>Clinical or therapeutic advice</li>
              <li>Guarantee of professional competency</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Termination</h2>
            <p className="text-gray-700 mb-4">Either party may terminate these Terms:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>By You:</strong> Stop using the service and delete your account</li>
              <li><strong>By Us:</strong> For violation of these Terms, with reasonable notice</li>
              <li><strong>Effect:</strong> Access to purchased content may be revoked upon termination for cause</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Governing Law and Disputes</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">12.1 Governing Law</h3>
            <p className="text-gray-700 mb-4">
              These Terms are governed by the laws of England and Wales.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">12.2 Dispute Resolution</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-gray-800 mb-2"><strong>Preferred Resolution:</strong></p>
              <p className="text-gray-700 text-sm">
                We encourage resolving disputes through direct communication. Contact us at{" "}
                <strong>[YOUR EMAIL]</strong> before pursuing formal legal action.
              </p>
            </div>
            <p className="text-gray-700 mb-6">
              For UK/EU users: You may have access to alternative dispute resolution schemes. International users: Disputes will be resolved in the courts of England and Wales.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Changes to Terms</h2>
            <p className="text-gray-700 mb-6">
              We may update these Terms from time to time. We will notify users of significant changes via email or prominent notice on the platform. Continued use constitutes acceptance of the updated Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms, contact:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700"><strong>Dr Richard May</strong></p>
              <p className="text-gray-700"><strong>Email:</strong> [YOUR EMAIL ADDRESS]</p>
              <p className="text-gray-700"><strong>Website:</strong> <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">https://richardjmay.github.io/</a></p>
              <p className="text-gray-700"><strong>Address:</strong> [YOUR BUSINESS ADDRESS]</p>
              <p className="text-gray-700"><strong>Country:</strong> United Kingdom</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">15. Severability</h2>
            <p className="text-gray-700 mb-6">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Acknowledgment</h3>
              <p className="text-green-700">
                By using optibl, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}