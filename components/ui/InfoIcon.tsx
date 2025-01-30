import { useState } from 'react';
import { NetworkCosts } from '../NetworkCosts';

export function InfoIcon() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        className="text-gray-400 hover:text-gray-300 transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </button>

      {showInfo && (
        <div className="absolute z-50 w-[600px] right-0 mt-2 transform translate-x-2">
          <NetworkCosts />
        </div>
      )}
    </div>
  );
}