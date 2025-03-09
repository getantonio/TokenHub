import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipRoot
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string | React.ReactNode;
  className?: string;
}

export function InfoTooltip({ content, className = "" }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-full w-4 h-4 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 focus:outline-none ${className}`}
          >
            <svg
              className="w-3 h-3"
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
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
} 