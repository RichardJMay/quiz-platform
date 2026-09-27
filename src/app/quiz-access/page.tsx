import Link from 'next/link'

export default function QuizAccessPage() {
  return <div className="bl-page bl-quiz-signin">
    <main className="bl-container">
      <p className="bl-kicker">BehaviorLingo practice</p>
      <h1>Individual purchases are unavailable.</h1>
      <p>During testing, an account gives access to every listed fluency pack.</p>
      <Link className="bl-back-link" href="/">Back to modules</Link>
    </main>
  </div>
}
