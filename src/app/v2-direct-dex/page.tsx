'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenForm_V2_DirectDEX } from '@/components/features/token/TokenForm_V2_DirectDEX';
import { ConnectWallet } from '@/components/wallet/ConnectWallet';
import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';

export default function V2DirectDEXPage() {
  const { isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <div className="flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">DirectDEX Token Factory</h1>
          <p className="text-gray-600 mb-8">Create and list your token directly on your preferred DEX with advanced features and controls.</p>
          
          <Tabs defaultValue="features" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="features"
                className="data-[state=active]:bg-blue-600"
              >
                Features
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-blue-600"
              >
                Create Token
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold mb-4">Advanced Token Features</h3>
                  <ul className="space-y-3">
                    <li>• Dynamic fee system that adapts to market conditions</li>
                    <li>• Auto-liquidity generation for sustainable growth</li>
                    <li>• Marketing and development fee allocation</li>
                    <li>• Anti-bot protection measures</li>
                  </ul>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold mb-4">Trading Controls</h3>
                  <ul className="space-y-3">
                    <li>• Customizable transaction limits</li>
                    <li>• Maximum wallet holdings</li>
                    <li>• Trading activation timer</li>
                    <li>• Blacklist management</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="create">
              {isConnected ? (
                <TokenForm_V2_DirectDEX isConnected={isConnected} />
              ) : (
                <div className="text-center p-8 bg-card rounded-lg border">
                  <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                  <p className="text-gray-600 mb-6">Connect your wallet to create a token with instant DEX listing</p>
                  <ConnectWallet />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
} 