import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import DirectListingForm from '@/components/features/token/DirectListingForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConnectWallet } from '@/components/common/ConnectWallet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function V2DirectDEXPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  
  const handleSuccess = () => {
    router.push('/dashboard');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Token Factory v2 DirectDEX"
        description="Create and instantly list your token on DEX with advanced trading controls."
      />
      
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Token</TabsTrigger>
          <TabsTrigger value="guide">Guide</TabsTrigger>
          <TabsTrigger value="fees">Fee System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          {!isConnected ? (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">Please connect your wallet to create and list a token</p>
              <ConnectWallet />
            </div>
          ) : (
            <DirectListingForm
              isConnected={isConnected}
              onSuccess={handleSuccess}
            />
          )}
        </TabsContent>
        
        <TabsContent value="guide">
          <div className="prose max-w-none">
            <h3>How to Create and List Your Token</h3>
            <ol>
              <li>Fill in your token details (name, symbol, supply)</li>
              <li>Choose your preferred DEX for listing</li>
              <li>Set initial liquidity and listing price</li>
              <li>Configure trading controls:
                <ul>
                  <li>Max transaction amount (anti-whale)</li>
                  <li>Max wallet size</li>
                  <li>Trading start time</li>
                </ul>
              </li>
              <li>Configure fee settings:
                <ul>
                  <li>Marketing fee (0-5%)</li>
                  <li>Development fee (0-5%)</li>
                  <li>Auto-liquidity fee (0-3%)</li>
                </ul>
              </li>
              <li>Review and deploy your token</li>
            </ol>
          </div>
        </TabsContent>
        
        <TabsContent value="fees">
          <div className="prose max-w-none">
            <h3>Fee System Explained</h3>
            <p>
              The v2 DirectDEX factory includes an optimized fee system that allows you to:
            </p>
            <ul>
              <li>Set separate fees for different purposes (marketing, development, liquidity)</li>
              <li>Automatically distribute fees to designated wallets</li>
              <li>Configure fee thresholds and limits</li>
            </ul>
            
            <h4>Fee Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold">Marketing Fee</h5>
                <p className="text-sm">
                  • Range: 0-5%<br />
                  • Used for promotion<br />
                  • Sent to marketing wallet
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold">Development Fee</h5>
                <p className="text-sm">
                  • Range: 0-5%<br />
                  • Supports development<br />
                  • Sent to dev wallet
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold">Auto-Liquidity Fee</h5>
                <p className="text-sm">
                  • Range: 0-3%<br />
                  • Adds to liquidity<br />
                  • Automatic process
                </p>
              </div>
            </div>
            
            <h4 className="mt-6">Fee Distribution</h4>
            <p>
              All fees are automatically distributed based on your configuration:
            </p>
            <ul>
              <li>Marketing fees are sent directly to your marketing wallet</li>
              <li>Development fees are sent to your development wallet</li>
              <li>Auto-liquidity fees are automatically added to the liquidity pool</li>
            </ul>
            
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <h5 className="text-sm font-semibold">Important Note:</h5>
              <p className="text-sm">
                Total combined fees cannot exceed 10% to ensure optimal trading experience and token health.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 