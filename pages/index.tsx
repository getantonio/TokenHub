import { useState } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { useNetwork } from '../contexts/NetworkContext';
import Head from 'next/head';
import Link from 'next/link';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background-primary">
      <Head>
        <title>Token Factory</title>
        <meta name="description" content="Create and manage your own tokens with Token Factory" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-text-primary text-center mb-2">Token Factory</h1>
        <p className="text-text-secondary text-center mb-8">Create and manage tokens across multiple networks</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* V1 Card */}
          <Link href="/v1" className="block">
            <div className="bg-background-secondary p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full">
              <div className="text-green-500 text-sm font-medium mb-2">CURRENT</div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Token Factory v1</h2>
              <p className="text-text-secondary mb-4">Basic ERC20 token creation with:</p>
              <ul className="text-text-secondary text-sm space-y-1 mb-4">
                <li>• Basic ERC20 features</li>
                <li>• Blacklist capability</li>
                <li>• Time lock mechanism</li>
                <li>• Multi-network support</li>
              </ul>
              <div className="text-text-accent mt-auto">Launch App →</div>
            </div>
          </Link>

          {/* V2 Card */}
          <Link href="/v2" className="block">
            <div className="bg-background-secondary p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full">
              <div className="text-yellow-500 text-sm font-medium mb-2">COMING SOON</div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Token Factory v2</h2>
              <p className="text-text-secondary mb-4">Presale functionality with:</p>
              <ul className="text-text-secondary text-sm space-y-1 mb-4">
                <li>• Simple presale setup</li>
                <li>• Whitelist support</li>
                <li>• Timed rounds</li>
                <li>• Soft/Hard caps</li>
              </ul>
              <div className="text-text-accent mt-auto">Coming Soon →</div>
            </div>
          </Link>

          {/* V3 Card */}
          <div className="block">
            <div className="bg-background-secondary p-6 rounded-lg shadow-lg opacity-75 h-full">
              <div className="text-blue-500 text-sm font-medium mb-2">PLANNED</div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Token Factory v3</h2>
              <p className="text-text-secondary mb-4">Liquidity features with:</p>
              <ul className="text-text-secondary text-sm space-y-1 mb-4">
                <li>• Auto liquidity pool</li>
                <li>• Initial price setting</li>
                <li>• Liquidity locking</li>
                <li>• Trading limits</li>
              </ul>
              <div className="text-text-secondary mt-auto">In Development →</div>
            </div>
          </div>

          {/* V4 Card */}
          <div className="block">
            <div className="bg-background-secondary p-6 rounded-lg shadow-lg opacity-75 h-full">
              <div className="text-purple-500 text-sm font-medium mb-2">FUTURE</div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Token Factory v4</h2>
              <p className="text-text-secondary mb-4">Advanced features with:</p>
              <ul className="text-text-secondary text-sm space-y-1 mb-4">
                <li>• Auto verification</li>
                <li>• Marketing features</li>
                <li>• Governance options</li>
                <li>• Cross-chain support</li>
              </ul>
              <div className="text-text-secondary mt-auto">Coming Later →</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 