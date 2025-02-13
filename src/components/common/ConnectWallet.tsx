import { useConnect, type Connector } from 'wagmi';
import { Button } from '@/components/ui/button';

export function ConnectWallet() {
  const { connect, connectors } = useConnect();

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector: Connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={!connector.ready}
          variant={connector.id === 'injected' ? 'default' : 'secondary'}
        >
          <span>Connect {connector.name}</span>
        </Button>
      ))}
    </div>
  );
} 