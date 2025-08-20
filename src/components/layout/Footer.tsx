// src/components/layout/Footer.tsx
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Footer() {
  const router = useRouter();

  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <Image
              src="/images/icon.png"
              alt="optibl icon"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-gray-600">© 2025 optibl</span>
          </div>
          
          <div className="flex space-x-6 text-sm">
            <button
              onClick={() => router.push('/about')}
              className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              About optibl
            </button>
            <button
              onClick={() => router.push('/privacy')}
              className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => router.push('/terms')}
              className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <a 
              href="https://richardjmay.github.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              About Dr May
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}