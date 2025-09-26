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
            
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">

          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
              Designed for fast and measurable progress
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              The material is presented via carefully sequenced multiple-choice items.
              Practice with feedback, track accuracy and build pace.
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
                Items progress from foundational elements to application. The difficulty of items adjusts as you build mastery.
                This keep response effort productive—not trivial, not overwhelming.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Fluency: accuracy × pace
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Knowledge = performance when it’s fast and stable. Timed practice with feedback on
                accuracy and latency helps to develop "fluent" responding. Fluency is the goal, not just an arbitray measure.
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
                Quizzes are practice opportunities. Repeated retrieval with immediate, specific feedback strengthens
                durable performance.
              </p>
            </div>

          </div>

          {/* Precision Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Precision question sequencing
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              Item-level analytics guide each learning step, ensuring appropriately calibrated challenge when you need it.
            </p>
          </div>

          {/* Expert Content Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              Expertly-crafted content
            </h2>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 leading-relaxed text-lg mb-4">
                All item and explanation is authored and reviewed by <strong>Dr Rich May</strong>.
                
              </p>
            </div>

            {/* Dr May Profile (condensed) */}
<div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg flex flex-col items-center text-center">
  <img
    src="/images/dr-may-profile.jpg"
    alt="Dr Richard May"
    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover shadow-lg mb-4"
  />
  <h3 className="text-2xl font-semibold text-gray-900">
    Dr Richard May, PhD BCBA-D
  </h3>
  <p className="text-base text-gray-600 mt-1">
    Associate Professor of Behaviour Analysis<br className="hidden sm:block" />
    University of South Wales
  </p>
</div>

            <p className="text-gray-700 leading-relaxed text-lg mt-6">
            
            </p>
          </div>

          {/* The Difference - Call to Action */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">What you can expect</h2>
            <p className="text-lg mb-6">
              Clear sequencing · fluency targets · timely feedback · data-guided adjustments
            </p>
            <p className="text-blue-100 mb-4">
            
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Lets go!
            </button>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}
