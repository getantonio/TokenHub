import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAccount } from 'wagmi';

import { cn } from '@lib/utils';
import MainLayout from '@layouts/MainLayout';
import ConnectWallet from '@components/web3/ConnectWallet';
import NetworkStats from '@components/web3/NetworkStats';
import { Container } from '@components/ui/container';
import AmoyTokenForm from '@components/features/token/AmoyTokenForm';

export default function AmoyPage() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Head>
        <title>Token Factory - Polygon Amoy</title>
        <meta name="description" content="Create ERC20 tokens on Polygon Amoy testnet" />
      </Head>

      <MainLayout>
        <Container>
          <div className="flex flex-col gap-4 py-8">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Polygon Amoy Token Creator
                </h1>
                <p className="text-gray-400 mt-2">
                  Create ERC20 tokens on Polygon Amoy testnet with our optimized factory
                </p>
              </div>
              
              <div className="flex gap-2 items-center">
                <NetworkStats />
                <ConnectWallet />
              </div>
            </div>

            <div className={cn("rounded-lg border bg-card px-6 py-5 sm:px-8 sm:py-7 border-gray-800 bg-gray-900/80", 
              "mt-4 backdrop-blur-sm")}>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      Optimized for Polygon Amoy
                    </h2>
                    <p className="text-gray-400">
                      This specialized token factory is designed specifically for the Polygon Amoy testnet,
                      addressing the unique challenges of this experimental network.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-800/70 p-4 rounded-md border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Benefits</h3>
                      <ul className="space-y-2 text-gray-400 text-sm">
                        <li>• Simplified token creation process</li>
                        <li>• Lower gas consumption</li>
                        <li>• Reliable transaction handling</li>
                        <li>• Automatic token tracking</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-800/70 p-4 rounded-md border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Instructions</h3>
                      <ol className="space-y-2 text-gray-400 text-sm list-decimal list-inside">
                        <li>Connect your wallet to Polygon Amoy</li>
                        <li>Fill in your token details</li>
                        <li>Click "Create Token" and confirm in MetaMask</li>
                        <li>Receive your new token instantly</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  {mounted && <AmoyTokenForm isConnected={isConnected} />}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </MainLayout>
    </>
  );
} 