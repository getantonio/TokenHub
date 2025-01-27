import Link from 'next/link';
import { NetworkIndicator } from './NetworkIndicator';
import { useWallet } from '../contexts/WalletContext';
import { useState } from 'react';

export function Header() {
  const { isConnected, connectWallet } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-background-dark border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-4xl font-bold text-text-primary">
            TokenFactory
          </Link>
          
          <div className="flex items-center space-x-8">
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-text-secondary hover:text-text-accent flex items-center space-x-1"
              >
                <span>Menu</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background-dark border border-border rounded-lg shadow-lg py-2 z-50">
                  <Link 
                    href="/v1" 
                    className="block px-4 py-2 text-text-secondary hover:text-text-accent hover:bg-background-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Factory v1
                  </Link>
                  <Link 
                    href="/v2" 
                    className="block px-4 py-2 text-text-secondary hover:text-text-accent hover:bg-background-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Factory v2
                  </Link>
                  <Link 
                    href="/presale" 
                    className="block px-4 py-2 text-text-secondary hover:text-text-accent hover:bg-background-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Token Presale
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <NetworkIndicator />
              <button
                onClick={connectWallet}
                className={`px-4 py-2 rounded font-medium ${
                  isConnected 
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-400 transition-colors'
                }`}
              >
                {isConnected ? 'Connected' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 