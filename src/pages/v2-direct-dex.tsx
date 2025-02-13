import { ConnectWallet } from '@/components/wallet/ConnectWallet';
import { TokenForm_V2_DirectDEX } from '@/components/features/token/TokenForm_V2_DirectDEX';
import { useAccount } from 'wagmi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

export default function V2DirectDEXPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Token Factory v2 DirectDEX</h1>
          
          <Tabs defaultValue="create" className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Token</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <div className="grid gap-6">
                {!isConnected ? (
                  <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-400 mb-6">Connect your wallet to create a token with instant DEX listing</p>
                    <ConnectWallet />
                  </div>
                ) : (
                  <TokenForm_V2_DirectDEX
                    isConnected={isConnected}
                    onSuccess={() => {
                      console.log('Token deployed successfully');
                    }}
                    onError={(error) => {
                      console.error('Error deploying token:', error);
                    }}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="features">
              <div className="grid gap-6">
                <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                  <h2 className="text-xl font-bold text-white mb-4">Instant DEX Integration</h2>
                  <p className="text-gray-400 mb-6">
                    Create your token and instantly list it on decentralized exchanges with our integrated DEX features:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-blue-500/20">
                      <h3 className="font-semibold text-blue-400 mb-2">Trading Features</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Instant liquidity pool creation</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Automated market making</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Multi-DEX support</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Price impact protection</li>
                      </ul>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-green-500/20">
                      <h3 className="font-semibold text-green-400 mb-2">Security Features</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Anti-bot measures</li>
                        <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Trading limits</li>
                        <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Fee controls</li>
                        <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Ownership management</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
} 