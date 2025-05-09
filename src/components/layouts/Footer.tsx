"use client";

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-gray-900 border-t border-gray-800 p-4 text-center text-sm text-gray-400 mt-8">
      <p className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
        <span>Need help? Check out our</span>
        <Link 
          href="/guides" 
          className="inline-block px-2 py-1 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-900/20"
        >
          Guides
        </Link>
        <span>or join our</span>
        <a 
          href="https://discord.gg/VEGTRNhmKa" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block px-2 py-1 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-900/20"
        >
          Discord Community
        </a>
        <span>or</span>
        <Link 
          href="/fundus" 
          className="inline-block px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 transition-colors rounded-md font-medium shadow-lg hover:shadow-blue-500/20"
        >
          Fund Us
        </Link>
      </p>
    </footer>
  );
} 