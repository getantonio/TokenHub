'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from '@/components/layout/Footer';
import { Web3ModalProvider } from '@/components/providers/Web3ModalProvider';

// Dynamically import components that use client-side features
const TokenForm = dynamic(
  () => import('@/components/features/token/TokenForm_V2_DirectDEX').then(mod => mod.TokenForm_V2_DirectDEX),
  { ssr: false }
);

const ConnectButton = dynamic(
  () => import('@/components/wallet/ConnectButton').then(mod => mod.ConnectButton),
  { ssr: false }
);

function V2DirectDEXContent() {
  const { isConnected } = useAccount();
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Token Factory v2 DirectDEX</h1>
            <p className="text-text-secondary">Create and instantly list your token on DEX with advanced trading controls.</p>
          </div>
          
          <Tabs defaultValue="features" className="space-y-4">
            <TabsList className="bg-background-secondary border border-border p-1 rounded-lg">
              <TabsTrigger 
                value="features"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary rounded-md px-6"
              >
                Features
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary rounded-md px-6"
              >
                Create Token
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-background-secondary p-4 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Advanced Token Features</h3>
                  <ul className="space-y-2 text-text-secondary">
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
                <div className="bg-background-secondary p-4 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Trading Controls</h3>
                  <ul className="space-y-2 text-text-secondary">
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
                <div className="text-center py-6 bg-background-secondary rounded-lg border border-border">
                  <h2 className="text-xl font-bold text-text-primary mb-3">Connect Your Wallet</h2>
                  <p className="text-text-secondary mb-4">Please connect your wallet to create and list a token</p>
                  <ConnectButton />
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

export default function V2DirectDEXPage() {
  return (
    <Web3ModalProvider>
      <V2DirectDEXContent />
    </Web3ModalProvider>
  );
} 