'use client'

import { useRouter } from 'next/navigation'
import { Target, Users, Award, BookOpen, CheckCircle } from 'lucide-react' // removed Brain
import PageLayout from '@/components/layout/PageLayout'

export default function AboutPage() {
  const router = useRouter()

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">The approach behind optibl</h1>
          <p className="text-xl text-gray-600">
            Personalised practice for BCBA exam preparation
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">

          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
              Designed for measurable progress
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              optibl focuses on carefully constructed multiple-choice items and deliberate sequencing.
              You practice with feedback, track accuracy and pace, and move forward when clear mastery criteria are met.
            </p>
          </div>

          {/* Key Principles Grid */}
          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Component → composite sequencing
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Items progress from prerequisite elements to application. Difficulty adjusts to recent performance
                to keep response effort productive—not trivial, not overwhelming.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Fluency: accuracy × pace
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Knowing is useful when it’s fast and stable. optibl provides timed practice and feedback on both
                correctness and latency so fluent responding is the goal, not just a score.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                Interleaving for discrimination
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Topics are mixed on purpose. Interleaving strengthens stimulus control—selecting the right concept
                under changing conditions—so skills transfer beyond a single study set.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="h-5 w-5 mr-2 text-orange-600" />
                Retrieval with feedback
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Quizzes are practice opportunities. Repeated retrieval with immediate, specific feedback builds
                durable performance and reduces relearning.
              </p>
            </div>

          </div>

          {/* Precision Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Precision question sequencing
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              We use item statistics (difficulty, discrimination, response time) and simple decision rules
              to choose the next step. The aim is straightforward: the right amount of challenge at the right time.
            </p>
          </div>

          {/* Expert Content Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              Expert-crafted content
            </h2>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 leading-relaxed text-lg mb-4">
                Every item and explanation is authored and reviewed by <strong>Dr Richard May</strong>.
                Content is revised in response to learner data, not guesswork.
              </p>
            </div>

            {/* Dr May Profile */}
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-12 bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg">
              <img
                src="/images/dr-may-profile.jpg"
                alt="Dr Richard May"
                className="w-32 h-32 rounded-full object-cover mx-auto md:mx-0 shadow-lg flex-shrink-0"
              />
              <div className="text-center md:text-left flex-grow md:pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Dr Richard May, PhD BCBA-D
                </h3>
                <p className="text-base text-gray-600 mb-4 font-medium">
                  Associate Professor of Behaviour Analysis, University of South Wales
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>~20 years of international teaching experience</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Roles at Reykjavik University, University of Kent, University of Galway</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>External examiner for Masters programmes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Editorial board member of leading behaviour analysis journals</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed text-lg mt-6">
              The result is material that is technically accurate, clinically relevant, and teachable.
            </p>
          </div>

          {/* The Difference - Call to Action */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">What you can expect</h2>
            <p className="text-lg mb-6">
              Clear sequencing · fluency targets · timely feedback · data-guided adjustments
            </p>
            <p className="text-blue-100 mb-4">
              Ready to try a measured approach to exam prep?
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Try a sample pathway
            </button>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}
