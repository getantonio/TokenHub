import { useNetwork } from '@contexts/NetworkContext';
import { getNetworkName } from '@config/networks';
import { cn } from '@utils/cn';

interface NetworkIndicatorProps {
  className?: string;
}

export function NetworkIndicator({ className }: NetworkIndicatorProps) {
  const { chainId } = useNetwork();
  const networkName = getNetworkName(chainId);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        chainId ? 'bg-green-500' : 'bg-red-500'
      )} />
      <span className="text-sm text-gray-300">
        {networkName}
      </span>
    </div>
  );
}