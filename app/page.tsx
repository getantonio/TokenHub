'use client';

import { WalletConnect } from '@/components/wallet-connect';
import { NetworkSelector } from '@/components/network-selector';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Shield, ExternalLink, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useState } from 'react';

// Sample data - would come from your backend in production
const SAMPLE_TOKENS = [
  {
    name: 'ExampleCoin',
    symbol: 'EXC',
    price: 0.012,
    marketCap: '250000',
    nextPhasePrice: 0.015,
    raised: '1850',
    hardCap: '5000',
    progress: 37,
    minBuy: '0.1',
    maxBuy: '5',
    saleEnds: '2025-02-28T00:00:00',
    contractAddress: '0x1234...5678',
    age: '2d',
    verified: true,
  },
  {
    name: 'NewToken',
    symbol: 'NTK',
    price: 0.008,
    marketCap: '180000',
    nextPhasePrice: 0.01,
    raised: '950',
    hardCap: '3000',
    progress: 32,
    minBuy: '0.1',
    maxBuy: '3',
    saleEnds: '2025-03-15T00:00:00',
    contractAddress: '0x5678...9012',
    age: '6h',
    verified: true,
  },
  {
    name: 'Metaverse Token',
    symbol: 'MVT',
    price: 0.025,
    marketCap: '500000',
    nextPhasePrice: 0.03,
    raised: '2800',
    hardCap: '6000',
    progress: 47,
    minBuy: '0.2',
    maxBuy: '8',
    saleEnds: '2025-02-20T00:00:00',
    contractAddress: '0x9012...3456',
    age: '5d',
    verified: true,
  },
];

type SortKey = 'price' | 'marketCap' | 'age';

export default function Home() {
  const { isConnected } = useAccount();
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('age');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  };

  const handlePurchase = async () => {
    // This will be implemented with the actual contract interaction
    console.log('Purchase:', purchaseAmount, 'ETH');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedTokens = [...SAMPLE_TOKENS].sort((a, b) => {
    const aValue = a[sortKey].toString().replace(/[^0-9.]/g, '');
    const bValue = b[sortKey].toString().replace(/[^0-9.]/g, '');
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (Number(aValue) - Number(bValue)) * multiplier;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Hero Content */}
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white">
                Create and Deploy Your Token
              </h1>
              <p className="text-lg text-gray-400">
                Launch your own token with customizable features, vesting schedules, and token sales in minutes.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/create-token"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Token
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Token List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sort Controls */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => toggleSort('price')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortKey === 'price' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                Price <ArrowUpDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleSort('marketCap')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortKey === 'marketCap' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                Market Cap <ArrowUpDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleSort('age')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortKey === 'age' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                Age <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>

            {/* Token Cards */}
            <div className="space-y-4">
              {sortedTokens.map((token, index) => (
                <Card key={token.symbol} className="bg-gray-800 text-white">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Compact View */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold">{token.name}</h2>
                              {token.verified && (
                                <Shield className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{token.symbol}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Price</p>
                            <p className="font-medium">{token.price} ETH</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Market Cap</p>
                            <p className="font-medium">${token.marketCap}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Age</p>
                            <p className="font-medium">{token.age}</p>
                          </div>
                          <button
                            onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                            className="p-2 hover:bg-gray-700 rounded-lg"
                          >
                            {expandedCard === index ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {expandedCard === index && (
                        <div className="pt-4 border-t border-gray-700 space-y-4">
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between mb-2">
                              <span>Progress</span>
                              <span>{token.progress}%</span>
                            </div>
                            <Progress value={token.progress} className="bg-gray-700" />
                            <div className="flex justify-between mt-2 text-sm text-gray-400">
                              <span>{token.raised} ETH raised</span>
                              <span>{token.hardCap} ETH hard cap</span>
                            </div>
                          </div>

                          {/* Purchase Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Min Buy</p>
                              <p className="font-medium">{token.minBuy} ETH</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Max Buy</p>
                              <p className="font-medium">{token.maxBuy} ETH</p>
                            </div>
                          </div>

                          {/* Time Remaining */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{getTimeRemaining(token.saleEnds)} remaining</span>
                          </div>

                          {/* Purchase Interface */}
                          <div className="flex gap-3">
                            <input
                              type="number"
                              placeholder="Amount in ETH"
                              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={purchaseAmount}
                              onChange={(e) => setPurchaseAmount(e.target.value)}
                              min={token.minBuy}
                              max={token.maxBuy}
                              step="0.01"
                            />
                            <button
                              onClick={handlePurchase}
                              disabled={!isConnected}
                              className={`px-6 py-2 rounded-lg font-semibold ${
                                isConnected 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {isConnected ? 'Buy' : 'Connect Wallet'}
                            </button>
                          </div>

                          {/* Contract Info */}
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Contract:</span>
                            <code>{token.contractAddress}</code>
                            <a
                              href={`https://etherscan.io/address/${token.contractAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 