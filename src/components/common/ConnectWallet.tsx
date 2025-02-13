'use client';

import { Button } from '@/components/ui/button';
import { useConnect } from 'wagmi';

export function ConnectWallet() {
  const { connect, connectors } = useConnect();

  return (
    <div className="flex flex-col gap-4">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!connector.ready}
        >
          Connect {connector.name}
        </Button>
      ))}
    </div>
  );
} 