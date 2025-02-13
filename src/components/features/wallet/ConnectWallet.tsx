'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface ConnectWalletProps {
  className?: string;
}

export function ConnectWallet({ className = '' }: ConnectWalletProps) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className="text-gray-300">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button 
          variant="secondary" 
          onClick={() => disconnect()}
          className="bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 h-9"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button 
        onClick={handleConnect}
        className="bg-blue-600 hover:bg-blue-700 h-9"
      >
        Connect Wallet
      </Button>
    </div>
  );
} 