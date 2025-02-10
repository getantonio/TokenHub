import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';

interface InfoIconProps {
  content: string;
  className?: string;
}

export function InfoIcon({ content, className }: InfoIconProps) {
  return (
    <Tooltip content={content}>
      <div className={`cursor-help text-gray-400 hover:text-gray-300 ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-4 h-4"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path
            strokeWidth="2"
            d="M12 16v-4M12 8h.01"
          />
        </svg>
      </div>
    </Tooltip>
  );
}