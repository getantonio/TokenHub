import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useAccount } from 'wagmi';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import TokenForm_V4 from '@/components/features/token/TokenForm_V4';
import { Footer } from '@/components/layouts/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChainId } from '@/types/chain';
import { TCAP_v4 } from '@/components/features/token/TCAP_v4';
import { useToast } from '@/components/ui/toast/use-toast';
import { ethers } from 'ethers';

const ConnectWalletButton = dynamic(
  () => import('@/components/wallet/ConnectWallet').then(mod => mod.ConnectWallet),
  { ssr: false }
);

export default function V4Page() {
  const { chainId } = useNetwork();
  const { isConnected } = useAccount();
  const router = useRouter();
  const [showFeatures, setShowFeatures] = useState(false);
  const { toast } = useToast();
  
  // Set default network to Polygon Amoy
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum && chainId !== ChainId.POLYGON_AMOY) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x13882' }], // 0x13882 is the hex value for 80002 (Polygon Amoy)
          });
        } catch (error) {
          console.error('Failed to switch to Polygon Amoy:', error);
        }
      }
    };
    
    checkNetwork();
  }, [chainId]);
  
  // Check if the v4 factory contract exists
  useEffect(() => {
    const checkFactoryContract = async () => {
      if (window.ethereum && chainId === ChainId.POLYGON_AMOY) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const v4FactoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4 || 
                                  '0xA06cF00fC2B455f92319cc4A6088B5B6Ccd2F10f';
          
          console.log('Checking V4 factory contract at:', v4FactoryAddress);
          const code = await provider.getCode(v4FactoryAddress);
          const contractExists = code.length > 2; // "0x" means no code
          
          console.log('V4 factory contract exists:', contractExists);
          
          if (!contractExists) {
            toast({
              title: "Warning",
              description: "The V4 factory contract may not be deployed on Polygon Amoy. Some features might not work.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error checking V4 factory contract:', error);
        }
      }
    };
    
    checkFactoryContract();
  }, [chainId, toast]);
  
  const features = [
    {
      title: 'Dynamic Fee System',
      description: 'A flexible and adaptive fee mechanism that responds to market conditions.',
      details: [
        'Dynamic fee rates that adjust based on market activity and volume',
        'Automated fee distribution to designated wallets and purposes',
        'Auto-liquidity generation to maintain price stability',
        'Configurable tax brackets and thresholds'
      ]
    },
    {
      title: 'Advanced Tokenomics Engine',
      description: 'Comprehensive token economics system for sustainable growth.',
      details: [
        'Smart buyback mechanism that triggers based on price and volume conditions',
        'Automated burn system with configurable parameters',
        'Reward distribution system for token holders',
        'Anti-dump mechanisms and trading limits'
      ]
    },
    {
      title: 'Supply Control Mechanism',
      description: 'Sophisticated supply management with elastic capabilities.',
      details: [
        'Elastic supply adjustments based on market conditions',
        'Configurable mint and burn limits',
        'Supply scheduling for controlled token release',
        'Emergency supply controls for risk management'
      ]
    },
    {
      title: 'Distribution System',
      description: 'Efficient and fair token distribution mechanisms.',
      details: [
        'Gas-optimized airdrop mechanism for large-scale distributions',
        'Batch transfer functionality for efficient token movement',
        'Merkle-based distribution system for scalable airdrops',
        'Whitelist and vesting capabilities'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v4</title>
        <meta name="description" content="Create your own token with TokenHub.dev v4" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Token Factory v4</h1>
              <p className="text-gray-400">
                Next generation token creation platform with advanced economics and distribution features
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
              Polygon Amoy
            </Badge>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-700 p-1">
              <button
                onClick={() => setShowFeatures(true)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  showFeatures
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setShowFeatures(false)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  !showFeatures
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Create Token
              </button>
            </div>
          </div>

          {showFeatures ? (
            <>
              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {features.map((feature, index) => (
                  <Card key={index} className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start text-sm text-gray-300">
                          <span className="mr-2 text-blue-400">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>

              {/* Dynamic Fee System */}
              <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Dynamic Fee System</h3>
                <p className="text-gray-400 mb-6">
                  A flexible and adaptive fee mechanism that responds to market conditions. Our Dynamic Fee System is designed to support your token's long-term growth and sustainability. 
                  Unlike traditional fee systems, our fees are strategically allocated to benefit your token's ecosystem:
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-700/50 p-4 rounded-lg border border-blue-500/20">
                    <h4 className="font-semibold text-blue-400 mb-2">Automatic Liquidity Generation</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Automatically adds to liquidity pool</li>
                      <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Reduces price impact of trades</li>
                      <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Creates price stability</li>
                      <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Builds sustainable trading volume</li>
                    </ul>
                  </div>

                  <div className="bg-gray-700/50 p-4 rounded-lg border border-green-500/20">
                    <h4 className="font-semibold text-green-400 mb-2">Holder Rewards</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Redistributes fees to holders</li>
                      <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Incentivizes long-term holding</li>
                      <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Rewards loyal community members</li>
                      <li className="flex items-center"><span className="text-green-400 mr-2">•</span>Reduces selling pressure</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600/50 mb-6">
                  <h4 className="font-semibold text-white mb-2">How It Works</h4>
                  <ol className="space-y-4 text-gray-300">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">1.</span>
                      Fees are collected on trades based on market conditions
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">2.</span>
                      Smart contract automatically distributes fees:
                      <ul className="ml-6 mt-2 space-y-1">
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>40% to liquidity pool</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>40% to holder rewards</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>20% to development & marketing</li>
                      </ul>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">3.</span>
                      System adjusts fees based on:
                      <ul className="ml-6 mt-2 space-y-1">
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Trading volume</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Market volatility</li>
                        <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Liquidity levels</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-700/50 p-4 rounded-lg border border-yellow-500/20">
                    <h4 className="font-semibold text-yellow-400 mb-2">Key Benefits</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-center"><span className="text-yellow-400 mr-2">•</span>Self-sustaining liquidity growth</li>
                      <li className="flex items-center"><span className="text-yellow-400 mr-2">•</span>Reduced manipulation risk</li>
                      <li className="flex items-center"><span className="text-yellow-400 mr-2">•</span>Fair distribution of rewards</li>
                      <li className="flex items-center"><span className="text-yellow-400 mr-2">•</span>Sustainable token economics</li>
                    </ul>
                  </div>

                  <div className="bg-gray-700/50 p-4 rounded-lg border border-purple-500/20">
                    <h4 className="font-semibold text-purple-400 mb-2">Advanced Features</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span>Anti-whale mechanisms</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span>Flash trade protection</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span>Volume-based fee adjustment</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span>Transparent fee tracking</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <TokenForm_V4
                  isConnected={isConnected}
                  onSuccess={() => {
                    // Handle success
                  }}
                  onError={(error) => {
                    console.error('Error creating token:', error);
                  }}
                />
              </div>
              <div className="lg:col-span-1 space-y-6">
                <TCAP_v4 
                  onAnalyze={(address) => {
                    console.log('Analyzing token:', address);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
} 