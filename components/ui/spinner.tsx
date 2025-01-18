import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <div role="status" className={cn('animate-spin', className)} {...props}>
      <Loader2 className={sizeClasses[size]} />
      <span className="sr-only">Loading...</span>
    </div>
  );
} 