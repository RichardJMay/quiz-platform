import Link from 'next/link'
import type { ReactNode } from 'react'
import Footer from './Footer'

interface LegalLayoutProps {
  title: string
  label: string
  children: ReactNode
}

export default function LegalLayout({ title, label, children }: LegalLayoutProps) {
  return (
    <div className="bl-page bl-legal-page">
      <header className="bl-header">
        <div className="bl-container bl-header-inner">
          <Link className="bl-wordmark" href="/" aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark" aria-hidden="true">BL</span>
            <span>behavior<span>lingo</span></span>
          </Link>
          <nav className="bl-header-actions" aria-label="Main navigation">
            <Link className="bl-button bl-button-quiet" href="/">Home</Link>
            <Link className="bl-button bl-button-quiet" href="/#modules">Browse modules</Link>
          </nav>
        </div>
      </header>

      <main className="bl-container bl-legal-main">
        <div className="bl-legal-heading">
          <p className="bl-kicker">{label}</p>
          <h1>{title}</h1>
          <p className="bl-legal-date">BEHAVIORLINGO / UPDATED 27 SEPTEMBER 2026</p>
        </div>
        <div className="bl-legal-content">{children}</div>
      </main>

      <Footer />
    </div>
  )
}
