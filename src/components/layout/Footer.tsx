import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bl-footer">
      <div className="bl-container bl-footer-inner">
        <div>
          <div className="bl-footer-wordmark">behavior<span>lingo</span></div>
          <p>Fluency training for behaviour analysis.</p>
        </div>
        <nav className="bl-footer-links" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span className="bl-copyright">© 2026 BehaviorLingo</span>
      </div>
    </footer>
  )
}
