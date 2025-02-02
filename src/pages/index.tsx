import { useEffect, useState } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import { useNetwork } from '@contexts/NetworkContext';
import { TokenSaleCard } from '@components/features/token/TokenSaleCard';
import { TokenCategoryFilter, Category } from '@components/features/token/TokenCategoryFilter';
import { FactoryFeatureCard } from '@components/common/FactoryFeatureCard';
import { InfoIcon } from '@components/ui/InfoIcon';
import Head from 'next/head';
import { TokenListing } from '../types/token-listing';
import Link from 'next/link';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

const FACTORY_FEATURES = [
  {
    version: "1.1.0",
    status: 'ACTIVE' as const,
    title: "Token Factory v1",
    description: "Production-ready ERC20 token creation with essential features",
    features: [
      "Basic ERC20 features",
      "Blacklist capability",
      "Time lock mechanism",
      "Multi-network support",
      "Role-based access",
      "Pausable transfers",
      "Burnable tokens",
      "Snapshot support"
    ],
    details: "Create your own ERC20 token with essential security features. The V1 factory provides a solid foundation for basic token creation with built-in security measures. Deployment fee is 0.0001 ETH. Supported networks include ETH, BSC, and Polygon. Contract is fully audited but not upgradeable.",
    link: "/v1",
    action: "Launch App"
  },
  {
    version: "2.1.0",
    status: 'ACTIVE' as const,
    title: "Token Factory v2",
    description: "Advanced token creation with built-in presale functionality",
    features: [
      "Simple presale setup",
      "Whitelist support",
      "Timed rounds",
      "Soft/Hard caps",
      "Auto liquidity",
      "Vesting schedules",
      "Anti-bot measures",
      "Fair launch options"
    ],
    details: "Advanced token creation platform with integrated presale capabilities. The V2 factory introduces sophisticated features perfect for professional token launches. Deployment fee is 0.0002 ETH. Supported networks include ETH, BSC, Polygon, and Arbitrum. Contract is audited and upgradeable.",
    link: "/v2",
    action: "Launch App"
  },
  {
    version: "3.0.0",
    status: 'PLANNED' as const,
    title: "Token Factory v3",
    description: "Next-generation token platform with DAO and governance features",
    features: [
      "Built-in DAO functionality",
      "Governance token creation",
      "Proposal system",
      "Voting mechanisms",
      "Treasury management",
      "Multi-sig support",
      "Cross-chain bridges",
      "Advanced analytics"
    ],
    details: "The upcoming V3 platform will revolutionize token creation with integrated DAO and governance features. Planned deployment fee of 0.0003 ETH. Will support all major EVM chains including Layer 2 solutions. Enhanced security features and complete decentralization options. Expected release: Q3 2024.",
    link: "",
    action: "Coming Soon"
  },
  {
    version: "4.0.0",
    status: 'FUTURE' as const,
    title: "Token Factory v4",
    description: "AI-powered token creation and management platform",
    features: [
      "AI-driven token optimization",
      "Automated market making",
      "Smart contract analysis",
      "Risk assessment",
      "Predictive analytics",
      "Cross-chain interoperability",
      "Zero-knowledge proofs",
      "Advanced security features"
    ],
    details: "The future of token creation with AI-powered features and advanced automation. Will include revolutionary features like automated market making and intelligent contract optimization. Planned integration with all major blockchain networks and Layer 2 solutions. Target release: 2025.",
    link: "",
    action: "In Development"
  }
];

const SAMPLE_TOKENS: TokenListing[] = [
  {
    name: 'Sample Token 1',
    symbol: 'ST1',
    description: 'A sample token for demonstration',
    price: {
      eth: '0.001',
      usd: '2.50',
      change24h: 5.5
    },
    marketCap: '1000000',
    supply: {
      total: '1000000',
      forSale: '500000'
    },
    raised: {
      current: '100',
      target: '200'
    },
    progress: 50,
    status: 'live',
    startTime: '2024-01-01T00:00:00.000Z',
    endTime: '2024-02-01T00:00:00.000Z',
    listedDate: '2024-01-01T00:00:00.000Z',
    factoryVersion: 'v1',
    trending: true,
    isNew: true
  },
  {
    name: 'Sample Token 2',
    symbol: 'ST2',
    description: 'Another sample token for demonstration',
    price: {
      eth: '0.002',
      usd: '5.00',
      change24h: -2.3
    },
    marketCap: '2000000',
    supply: {
      total: '2000000',
      forSale: '1000000'
    },
    raised: {
      current: '0',
      target: '500'
    },
    progress: 0,
    status: 'upcoming',
    startTime: '2024-02-01T00:00:00.000Z',
    endTime: '2024-03-01T00:00:00.000Z',
    listedDate: '2024-02-01T00:00:00.000Z',
    factoryVersion: 'v2',
    trending: false,
    isNew: true
  },
  {
    name: 'Sample Token 3',
    symbol: 'ST3',
    description: 'A completed token sale',
    price: {
      eth: '0.003',
      usd: '7.50',
      change24h: 15.7
    },
    marketCap: '3000000',
    supply: {
      total: '3000000',
      forSale: '1500000'
    },
    raised: {
      current: '300',
      target: '300'
    },
    progress: 100,
    status: 'ended',
    startTime: '2023-12-01T00:00:00.000Z',
    endTime: '2024-01-01T00:00:00.000Z',
    listedDate: '2023-12-01T00:00:00.000Z',
    factoryVersion: 'v1',
    trending: true,
    isNew: false
  }
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filteredTokens = SAMPLE_TOKENS.filter(token => {
    switch (activeCategory) {
      case 'live':
        return token.status === 'live';
      case 'upcoming':
        return token.status === 'upcoming';
      case 'ended':
        return token.status === 'ended';
      case 'trending':
        return token.trending;
      case 'new':
        return token.isNew;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Create and Manage Tokens</title>
        <meta name="description" content="Create and manage your own tokens with TokenHub.dev" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Feature Cards Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white">Token Hub Features</h2>
                <p className="text-gray-400 mt-2">
                  Create and Deploy Your Token<br />
                  <span className="text-sm">
                    Launch your own token with customizable features, vesting schedules, and token sales in minutes.
                  </span>
                </p>
              </div>
              <InfoIcon content="Learn more about our token creation process" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FACTORY_FEATURES.map((feature, index) => (
                <FactoryFeatureCard
                  key={index}
                  {...feature}
                />
              ))}
            </div>
          </section>

          {/* Token Sale Cards Section */}
          <section>
            <h2 className="text-3xl font-bold text-white text-center mb-2">Featured Tokens</h2>
            <p className="text-gray-400 text-center mb-4">Explore our latest token offerings</p>
            
            <TokenCategoryFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            
            <div className="space-y-2 mt-4">
              {filteredTokens.map((token, index) => (
                <TokenSaleCard
                  key={index}
                  {...token}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}