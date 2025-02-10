import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import TokenForm_V4 from '@/components/features/token/TokenForm_V4';
import { useAccount } from 'wagmi';

export default function V4Page() {
  const { chainId } = useNetwork();
  const { isConnected } = useAccount();
  const [showFeatures, setShowFeatures] = useState(true);
  
  const features = [
    {
      title: 'Dynamic Tax System',
      description: 'A flexible and adaptive tax mechanism that responds to market conditions.',
      details: [
        'Dynamic tax rates that adjust based on market activity and volume',
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
        <meta name="description" content="Next generation token creation platform with advanced economics and distribution" />
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
              Development
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
              {/* Coming Soon Message */}
              <Card className="mb-8 p-6 bg-blue-900/20 border border-blue-500/20">
                <h2 className="text-xl font-bold text-white mb-4">Join the Beta Program</h2>
                <p className="text-gray-300 mb-4">
                  Token Factory V4 is currently in development. Join our Discord community to:
                </p>
                <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                  <li>Get early access to the beta version</li>
                  <li>Provide feedback and shape the future of the platform</li>
                  <li>Stay updated on development progress</li>
                  <li>Connect with other token creators</li>
                </ul>
                <div className="flex gap-4">
                  <a
                    href="https://discord.gg/tokenhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Join Discord Community
                  </a>
                  <Link
                    href="/docs/v4"
                    className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    View Documentation
                  </Link>
                </div>
              </Card>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </>
          ) : (
            <TokenForm_V4 
              isConnected={isConnected}
              onSuccess={() => {
                // TODO: Handle success
                console.log('Token deployed successfully');
              }}
              onError={(error) => {
                // TODO: Handle error
                console.error('Error deploying token:', error);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
} 