import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi'; // Import useAccount for EVM status
import { useStacksWallet } from '@/contexts/StacksWalletContext'; // Import Stacks context
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import TokenForm_v1_EVM from '@/components/features/token/TokenForm_v1_EVM';
import TokenForm_v1_Stacks from '@/components/features/token/TokenForm_v1_Stacks';
import TCAP_v1 from '@/components/features/token/TCAP_v1';
import TCAP_v1stx from '@/components/features/token/TCAP_v1stx';
import { BrowserProvider } from 'ethers'; // Keep for TCAP?
import { FACTORY_ADDRESSES } from '@/config/contracts';
import Head from 'next/head';
import { Footer } from '@/components/layouts/Footer';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/utils/cn'; // Import cn for conditional classes

// Hardcoded Amoy factory address
const AMOY_FACTORY_ADDRESS = "0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36";
const ARBITRUM_SEPOLIA_FACTORY_ADDRESS = "0x9209DfFAddB8a8bfe4ffaa2b79537461E478386d";

export default function V1Page() {
  // EVM Connection State
  const { isConnected: isEvmConnected, chainId: evmChainId } = useAccount();
  const [evmProvider, setEvmProvider] = useState<BrowserProvider | null>(null);

  // Stacks Connection State
  const { isConnected: isStacksConnected, address: stacksAddress } = useStacksWallet();
  
  // Set EVM provider if connected (for TCAP)
  useEffect(() => {
    if (isEvmConnected && window.ethereum) {
      setEvmProvider(new BrowserProvider(window.ethereum));
    } else {
      setEvmProvider(null);
    }
  }, [isEvmConnected]);

  // Get the appropriate EVM factory address based on the network
  const getFactoryAddress = () => {
    if (!evmChainId) return undefined;
    // Simplified logic assuming FACTORY_ADDRESSES is correctly structured
    return FACTORY_ADDRESSES.v1[evmChainId] ?? undefined;
  };
  const factoryAddress = getFactoryAddress();

  // Determine the default/active tab
  const [activeTab, setActiveTab] = useState('evm');

  // Effect to switch tab based on wallet connection
  useEffect(() => {
    if (isEvmConnected) {
      setActiveTab('evm');
    } else if (isStacksConnected) {
      setActiveTab('stacks');
    } else {
      // Default to EVM if neither is connected initially
      setActiveTab('evm');
    }
  }, [isEvmConnected, isStacksConnected]);

  // Debug log for activeTab
  console.log('[v1 Page] Active Tab:', activeTab, 'EVM Connected:', isEvmConnected, 'Stacks Connected:', isStacksConnected);

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v1</title>
        <meta name="description" content="Create your own token with TokenHub.dev v1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-3 text-center">Token Factory v1</h1>
            <p className="text-base text-gray-300 text-center">Create a basic ERC-20 (EVM) or SIP-010 (Stacks) token with essential features.</p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "evm" | "stacks")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="evm" 
                disabled={isStacksConnected} 
                className={cn(
                  "py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors duration-150", // Base
                  {
                    // Disabled State
                    "opacity-50 cursor-not-allowed text-gray-600 border-transparent": isStacksConnected,
                    // Active State (EVM)
                    "border-blue-500 text-blue-300 bg-blue-900/20 font-semibold": !isStacksConnected && activeTab === 'evm',
                    // Inactive State
                    "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-800/50": !isStacksConnected && activeTab !== 'evm'
                  }
                )}
              >
                EVM Networks (Ethereum, Polygon, etc.)
              </TabsTrigger>
              <TabsTrigger 
                value="stacks"
                disabled={isEvmConnected} // Disable if EVM wallet is connected
                className={cn(
                  // Base styles (apply always)
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 py-2.5 text-sm rounded-t-md border-b-2 transition-colors duration-150 font-medium",
                  {
                    // Disabled State
                    "opacity-50 cursor-not-allowed text-gray-600 border-transparent": isEvmConnected,
                    
                    // Active State (Stacks) - Using data-state selector for specificity
                    "data-[state=active]:border-purple-500 data-[state=active]:text-purple-300 data-[state=active]:bg-purple-900/30 data-[state=active]:font-semibold data-[state=active]:shadow-none": !isEvmConnected && activeTab === 'stacks',
                    
                    // Inactive State (when EVM is disconnected)
                    "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-800/50": !isEvmConnected && activeTab !== 'stacks'
                  }
                )}
              >
                Stacks Network
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="evm">
              <h2 className="text-2xl font-semibold text-white mb-4">Create EVM Token (ERC-20)</h2>
              {isStacksConnected ? (
                <div className="text-center p-6 bg-gray-800/50 border border-yellow-500/50 rounded-md text-yellow-300">
                  Please disconnect your Stacks wallet to use the EVM factory.
                </div>
              ) : (
                <>
                  <TokenForm_v1_EVM isConnected={isEvmConnected} /> 
                  <div className="mt-8">
                    <TCAP_v1 
                      isConnected={isEvmConnected}
                      address={factoryAddress}
                      provider={evmProvider}
                    />
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="stacks">
              <h2 className="text-2xl font-semibold text-white mb-4">Create Stacks Token (SIP-010)</h2>
              {isEvmConnected ? (
                <div className="text-center p-6 bg-gray-800/50 border border-yellow-500/50 rounded-md text-yellow-300">
                  Please disconnect your EVM wallet to use the Stacks factory.
                </div>
              ) : (
                <>
                  <TokenForm_v1_Stacks />
                  <div className="mt-8">
                    <TCAP_v1stx isConnected={isStacksConnected} />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </main>
      <Footer />
    </div>
  );
}