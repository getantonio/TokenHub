import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-gray-900 border-t border-gray-800 p-4 text-center text-sm text-gray-400 mt-8">
      <p className="flex items-center justify-center gap-2">
        Need help? Check out our{' '}
        <Link 
          href="/guides" 
          className="inline-block px-2 py-1 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-900/20"
        >
          guides
        </Link>
        {' '}or join our{' '}
        <a 
          href="https://discord.gg/VEGTRNhmKa" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block px-2 py-1 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-900/20"
        >
          Discord community
        </a>
      </p>
    </footer>
  );
} 