import { useState } from 'react';
import { cn } from '@utils/cn';

export interface InfoIconProps {
  content: string;
  className?: string;
}

export function InfoIcon({ content, className }: InfoIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center cursor-help',
          'hover:bg-gray-600 transition-colors',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-xs font-medium text-gray-300">i</span>
      </div>
      
      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-800 text-gray-300 text-sm rounded-lg shadow-lg p-3 max-w-xs">
            {content}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-8 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}