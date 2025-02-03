import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import { getNetworkContractAddress } from '@config/contracts';
import TokenForm_v3 from '@components/features/token/TokenForm_v3';
import TCAP_v3 from '@components/features/token/TCAP_v3';
import { Card } from '@components/ui/card';

export default function V3Page() {
  const { chainId, isSupported } = useNetwork();
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | undefined>();

  useEffect(() => {
    if (chainId) {
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV3');
      setAddress(factoryAddress || undefined);
    }
  }, [chainId]);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request<string[]>({ method: 'eth_accounts' });
          const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
          setIsConnected(hasAccounts);
          if (hasAccounts) {
            setProvider(new BrowserProvider(window.ethereum));
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
        setIsConnected(hasAccounts);
        if (hasAccounts) {
          setProvider(new BrowserProvider(window.ethereum!));
        } else {
          setProvider(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  if (!chainId || !isSupported) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Network Not Supported</h2>
        <p className="text-gray-400">Please connect to a supported network to continue.</p>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Please connect your wallet to continue.</p>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <TokenForm_v3
        isConnected={isConnected}
        address={address}
        provider={provider}
      />
      
      <TCAP_v3
        isConnected={isConnected}
        address={address}
        provider={provider}
      />
    </div>
  );
} 