// src/components/layout/Header.tsx
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

interface HeaderProps {
  showMyQuizzes?: boolean;
  onMyQuizzesToggle?: () => void;
  purchasedQuizzes?: any[];
}

export default function Header({ 
  showMyQuizzes = false, 
  onMyQuizzesToggle,
  purchasedQuizzes = [] 
}: HeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');

  const handleAuthModalOpen = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      <header className="backdrop-blur-sm bg-white/80 border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 min-w-0">
            <div className="flex items-center space-x-3">
              <div className="relative min-w-0 flex-shrink-0 cursor-pointer" onClick={() => router.push('/')}>
                <Image
                  src="/images/logo-header.png"
                  alt="Dr May's Adaptive Learning Analytics"
                  width={320}
                  height={80}
                  className="h-10 w-auto sm:h-14 md:h-16 lg:h-20 max-w-none"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end space-y-2">
              {user ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-gray-700 text-sm sm:text-base">
                    Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>
                  <div className="flex space-x-2 sm:space-x-3">
                    {onMyQuizzesToggle && (
                      <button
                        onClick={onMyQuizzesToggle}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        📚 My Quizzes ({purchasedQuizzes.length})
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/progress')}
                      className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📊 Progress
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      👋 Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleAuthModalOpen('login')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthModalOpen('register')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onSwitchMode={(newMode) => setAuthMode(newMode)}
        />
      )}
    </>
  );
}