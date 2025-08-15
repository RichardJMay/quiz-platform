import { Brain, Target, Users, Award, BookOpen, CheckCircle } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Your header component */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">The Science Behind optibl</h1>
          <p className="text-xl text-gray-600">
            Personalised Learning Pathways for BCBA Exam Success
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          
          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="h-6 w-6 mr-2 text-blue-600" />
              Learning That Actually Works
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              Most study platforms throw questions at you and hope something sticks. optibl is different. 
              Every aspect of our platform is built on proven learning science to help you master BCBA 
              concepts efficiently and permanently.
            </p>
          </div>

          {/* Key Principles Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Optimal Challenge Through Smart Sequencing
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Your brain learns best when content builds systematically from foundational concepts to more 
                complex applications. optibl sequences questions to maintain the optimal learning zone—challenging 
                enough to promote growth without causing cognitive overload.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Beyond Getting It Right: Building Fluency
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Knowing the answer isn't enough—you need to access it quickly and confidently under exam 
                pressure. optibl tracks both accuracy and speed, helping you develop fluency that transfers 
                to real-world situations.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                Smart Practice Through Interleaving
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Instead of studying one topic at a time, optibl mixes topics strategically. This approach 
                strengthens your ability to discriminate between concepts and apply knowledge flexibly—exactly 
                what you need for the BCBA exam.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="h-5 w-5 mr-2 text-orange-600" />
                Test-Enhanced Learning
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Every quiz isn't just assessment—it's active learning. The act of retrieving information 
                from memory strengthens neural pathways, making knowledge more durable and accessible.
              </p>
            </div>

          </div>

          {/* Precision Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Precision Question Sequencing
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              Behind the scenes, sophisticated modeling ensures every question is perfectly positioned in 
              your learning journey. Questions are calibrated based on thousands of previous responses to 
              present the right challenge at the right moment, maximizing your study efficiency.
            </p>
          </div>

          {/* Expert Content Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              Expert-Crafted Content
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 leading-relaxed text-lg mb-4">
                While AI can generate content quickly, optibl takes a different path. Every question and 
                explanation is created by <strong>Dr Richard May</strong>, bringing nearly 20 years of 
                expertise to your learning experience.
              </p>
            </div>

            {/* Dr May Profile */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <img 
                src="/images/dr-may-profile.jpg" 
                alt="Dr Richard May" 
                className="w-24 h-24 rounded-full object-cover mx-auto md:mx-0 shadow-lg"
              />
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Dr Richard May, PhD BCBA-D
                </h3>
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  Associate Professor of Behaviour Analysis, University of South Wales
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Nearly 20 years of international teaching experience</li>
                  <li>• Teaching roles at Reykjavik University, University of Kent, University of Galway</li>
                  <li>• External examiner for Masters programmes</li>
                  <li>• Editorial board member of top behavior analysis journals</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed text-lg mt-6">
              This human expertise ensures content that's not just accurate, but clinically relevant and 
              pedagogically sound—something no algorithm can replicate.
            </p>
          </div>

          {/* The Difference - Call to Action */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">The optibl Difference</h2>
            <p className="text-lg mb-6">
              <strong>Science-backed learning</strong> + <strong>Expert content</strong> + <strong>Adaptive technology</strong> = <strong>Faster, more effective BCBA preparation</strong>
            </p>
            <p className="text-blue-100 mb-4">
              Ready to experience learning that's designed around how your brain actually works?
            </p>
            <a 
              href="/"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Start your personalized pathway to BCBA success
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}