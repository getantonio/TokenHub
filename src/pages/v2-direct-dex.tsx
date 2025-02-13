'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from '@/components/layout/Footer';

// Dynamically import components that use client-side features
const TokenForm = dynamic(
  () => import('@/components/features/token/TokenForm_V2_DirectDEX').then(mod => mod.TokenForm_V2_DirectDEX),
  { ssr: false }
);

const ConnectWalletButton = dynamic(
  () => import('@/components/wallet/ConnectWallet').then(mod => mod.ConnectWallet),
  { ssr: false }
);

export default function V2DirectDEXPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Token Factory v2 DirectDEX</h1>
            <p className="text-gray-400">Create and instantly list your token on DEX with advanced trading controls.</p>
          </div>
          
          <Tabs defaultValue="features" className="space-y-8">
            <TabsList className="bg-gray-800/50 border border-gray-700/50 p-1 rounded-lg">
              <TabsTrigger 
                value="features"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-md px-6"
              >
                Features
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-md px-6"
              >
                Create Token
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                  <h3 className="text-xl font-semibold text-white mb-4">Advanced Token Features</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Dynamic fee system that adapts to market conditions
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Auto-liquidity generation for sustainable growth
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Marketing and development fee allocation
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Anti-bot protection measures
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
                  <h3 className="text-xl font-semibold text-white mb-4">Trading Controls</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Customizable transaction limits
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Maximum wallet holdings
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Trading activation timer
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      Blacklist management
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="create">
              {!isConnected ? (
                <div className="text-center py-10 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
                  <p className="text-gray-400 mb-6">Please connect your wallet to create and list a token</p>
                  <ConnectWalletButton />
                </div>
              ) : (
                <TokenForm isConnected={isConnected} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
} 