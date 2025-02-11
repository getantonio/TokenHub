import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoIconProps {
  content: string;
  className?: string;
  variant?: 'icon' | 'question' | 'underline';
  children?: React.ReactNode;
}

export function InfoIcon({ content, className, variant = 'icon', children }: InfoIconProps) {
  if (variant === 'underline') {
    return (
      <Tooltip content={content}>
        <span className={cn("border-b border-dotted border-gray-400 hover:border-gray-300 cursor-help inline-flex items-center gap-1", className)}>
          {children}
        </span>
      </Tooltip>
    );
  }

  const iconContent = variant === 'question' ? (
    <span className={cn("inline-flex items-center justify-center rounded-full w-4 h-4 text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700", className)}>?</span>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={cn("w-4 h-4 inline-block align-text-bottom", className)}
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path
        strokeWidth="2"
        d="M12 16v-4M12 8h.01"
      />
    </svg>
  );

  return (
    <Tooltip content={content}>
      <span className="inline-flex items-center cursor-help text-gray-400 hover:text-gray-300">
        {children}
        {iconContent}
      </span>
    </Tooltip>
  );
}