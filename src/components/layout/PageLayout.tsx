// src/components/layout/PageLayout.tsx
'use client';

import Header from './Header';
import Footer from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
  showMyQuizzes?: boolean;
  onMyQuizzesToggle?: () => void;
  purchasedQuizzes?: any[];
}

export default function PageLayout({ 
  children, 
  showMyQuizzes = false,
  onMyQuizzesToggle,
  purchasedQuizzes = []
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header 
        showMyQuizzes={showMyQuizzes}
        onMyQuizzesToggle={onMyQuizzesToggle}
        purchasedQuizzes={purchasedQuizzes}
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}