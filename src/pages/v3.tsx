import TokenForm_v3 from '../components/features/token/TokenForm_v3';
import TCAP_v3 from '../components/features/token/TCAP_v3';
import { useAccount } from 'wagmi';
import { useEffect, useState, useRef } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { FACTORY_ADDRESSES } from '@config/contracts';
import { BrowserProvider } from 'ethers';
import Head from 'next/head';
import { Footer } from '@/components/layouts/Footer';
import { getNetworkContractAddress } from '@/config/contracts';

export default function V3() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const tcapRef = useRef<{ loadTokens: () => void } | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          }) as string[];
          setProvider(new BrowserProvider(window.ethereum));

          // Listen for account changes
          const handleAccountsChanged = (accounts: unknown) => {
            if (Array.isArray(accounts) && accounts.length > 0) {
              setProvider(new BrowserProvider(window.ethereum));
            } else {
              setProvider(null);
            }
          };

          window.ethereum.on('accountsChanged', handleAccountsChanged);

          return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
          };
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  const factoryAddress = chainId ? 
    getNetworkContractAddress(chainId, 'factoryAddressV3') as `0x${string}` : 
    undefined;

  const handleSuccess = () => {
    // Wait for the blockchain to index the new token
    setTimeout(() => {
      if (tcapRef.current) {
        tcapRef.current.loadTokens();
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v3</title>
        <meta name="description" content="Create your own token with TokenHub.dev v3" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white mb-2">Token Factory v3</h1>
            <p className="text-white">Create your own token with advanced features like presale, liquidity locking, and vesting.</p>
          </div>

          <div className="space-y-4">
            <TokenForm_v3 
              isConnected={isConnected}
              onSuccess={handleSuccess}
              externalProvider={provider}
            />
            
            <TCAP_v3 
              ref={tcapRef}
              isConnected={isConnected}
              address={factoryAddress}
              provider={provider}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 