// src/app/privacy/page.tsx
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/80 border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dr May&apos;s Quiz Master Pro
              </h1>
            </a>
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">
            <strong>Last updated:</strong> August 12, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-6">
              Dr May&apos;s Quiz Master Pro (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the website{" "}
              <span className="font-medium">[YOUR DOMAIN]</span> (the &ldquo;Service&rdquo;).
            </p>
            <p className="text-gray-700 mb-6">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
              It applies to all users worldwide, in compliance with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other major privacy laws.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 Personal Information You Provide</h3>
            <p className="text-gray-700 mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Account Information:</strong> Full name, email address, password.</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe — we do not store card details.</li>
              <li><strong>Profile Information:</strong> Academic or professional details you choose to share.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.2 Usage Information Collected Automatically</h3>
            <p className="text-gray-700 mb-4">We collect certain information automatically when you use our Service:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Quiz Performance Data:</strong> Scores, completion times, fluency metrics, attempt history.</li>
              <li><strong>Technical Information:</strong> IP address, browser type, device information.</li>
              <li><strong>Website Usage Data:</strong> Pages visited, time spent, click patterns.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.3 Cookies and Tracking Technologies</h3>
            <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Maintain your login session.</li>
              <li>Remember your preferences.</li>
              <li>Analyze website performance.</li>
              <li>Improve user experience.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We process your information for the following purposes:</p>
            
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Example Data Used</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Legal Basis (GDPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Provide Services</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Account data, quiz scores</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Process Payments</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Payment info</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Improve Platform</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Usage data, cookies</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Legitimate interests</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Communications</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Email, name</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Consent & legitimate interests</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4 font-semibold">We do not sell your personal information.</p>
            <p className="text-gray-700 mb-4">We share it only in these cases:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Payment Processing:</strong> With Stripe for secure payment handling.</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety.</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale.</li>
              <li><strong>With Consent:</strong> When you explicitly authorize sharing.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">We implement measures to protect your data:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Encryption:</strong> SSL/TLS encryption for data in transit.</li>
              <li><strong>Access Controls:</strong> Limited access to authorized personnel.</li>
              <li><strong>Security Updates:</strong> Regular patching and monitoring.</li>
              <li><strong>PCI DSS Compliance:</strong> Stripe payment processing security.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Correct:</strong> Update inaccurate information.</li>
              <li><strong>Delete:</strong> Request deletion of your data and account.</li>
              <li><strong>Export:</strong> Receive your data in a portable format.</li>
              <li><strong>Withdraw Consent:</strong> Opt-out of non-essential communications.</li>
            </ul>
            <p className="text-gray-700 mb-6">
              To exercise your rights, contact us at <strong>[YOUR EMAIL]</strong>. We may verify your identity before responding.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Data Retention</h2>
            <p className="text-gray-700 mb-4">We retain your data only as long as necessary:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li><strong>Account Data:</strong> Until you delete your account.</li>
              <li><strong>Quiz Data:</strong> To provide ongoing progress tracking.</li>
              <li><strong>Payment Records:</strong> As required by law (typically 7 years).</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contact Information</h2>
            <p className="text-gray-700 mb-4">For privacy-related questions or requests, contact:</p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700"><strong>Email:</strong> [YOUR EMAIL ADDRESS]</p>
              <p className="text-gray-700"><strong>Website:</strong> <a href="https://richardjmay.github.io/" className="text-blue-600 hover:text-blue-800">https://richardjmay.github.io/</a></p>
              <p className="text-gray-700"><strong>Address:</strong> [YOUR BUSINESS ADDRESS]</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Consent</h3>
              <p className="text-green-700">
                By using Dr May&apos;s Quiz Master Pro, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}