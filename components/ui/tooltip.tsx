"use client";

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tooltipWidth = window.innerWidth * 0.4; // 40% of viewport width
      const spaceOnRight = window.innerWidth - rect.right;
      
      setPosition(spaceOnRight > tooltipWidth ? 'right' : 'left');
    }
  }, [isVisible]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center gap-1"
      >
        {children}
        <svg 
          className="w-3 h-3 text-gray-400 hover:text-gray-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`
            absolute z-50 p-4 text-sm text-gray-200 
            bg-gray-900 rounded-lg shadow-lg border border-gray-700
            ${position === 'right' 
              ? 'left-full ml-2' 
              : 'right-full mr-2'
            }
            -top-1
          `}
          style={{
            width: '40vw',
            maxWidth: '500px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}; 