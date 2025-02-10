import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import Head from 'next/head';
import { Spinner } from '../components/ui/Spinner';
import { TokenSaleCard } from '@/components/features/token/TokenSaleCard';
import { TokenListingCard } from '@/components/features/token/TokenListingCard';

interface PresaleToken {
  address: string;
  name: string;
  symbol: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  presaleRate: string;
  startTime: number;
  endTime: number;
  totalContributed: string;
  isWhitelistEnabled: boolean;
  status: 'pending' | 'active' | 'ended';
  userContribution?: string;
  isWhitelisted?: boolean;
}

export default function PresalePage() {
  const { chainId } = useNetwork();
  const [presaleTokens, setPresaleTokens] = useState<PresaleToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ending_soon' | 'active' | 'upcoming' | 'ended'>('active');

  useEffect(() => {
    // For now, let's add some sample tokens
    const sampleTokens: PresaleToken[] = [
      {
        address: "0x1234567890123456789012345678901234567890",
        name: "Sample Token 1",
        symbol: "ST1",
        softCap: "50",
        hardCap: "100",
        minContribution: "0.1",
        maxContribution: "5",
        presaleRate: "1000",
        startTime: Math.floor(Date.now() / 1000) - 3600, // Started 1 hour ago
        endTime: Math.floor(Date.now() / 1000) + 86400, // Ends in 24 hours
        totalContributed: "35",
        isWhitelistEnabled: true,
        status: 'active',
        userContribution: "2.5",
        isWhitelisted: true
      },
      {
        address: "0x0987654321098765432109876543210987654321",
        name: "Sample Token 2",
        symbol: "ST2",
        softCap: "100",
        hardCap: "200",
        minContribution: "0.5",
        maxContribution: "10",
        presaleRate: "2000",
        startTime: Math.floor(Date.now() / 1000) + 3600, // Starts in 1 hour
        endTime: Math.floor(Date.now() / 1000) + 172800, // Ends in 48 hours
        totalContributed: "0",
        isWhitelistEnabled: false,
        status: 'pending',
      },
      {
        address: "0x5555555555555555555555555555555555555555",
        name: "Sample Token 3",
        symbol: "ST3",
        softCap: "75",
        hardCap: "150",
        minContribution: "0.2",
        maxContribution: "7",
        presaleRate: "1500",
        startTime: Math.floor(Date.now() / 1000) - 172800, // Started 48 hours ago
        endTime: Math.floor(Date.now() / 1000) - 3600, // Ended 1 hour ago
        totalContributed: "145",
        isWhitelistEnabled: false,
        status: 'ended',
        userContribution: "5"
      }
    ];

    setPresaleTokens(sampleTokens);
  }, []);

  const mapPresaleStatus = (status: 'active' | 'pending' | 'ended'): 'live' | 'upcoming' | 'ended' => {
    switch (status) {
      case 'active': return 'live';
      case 'pending': return 'upcoming';
      case 'ended': return 'ended';
    }
  };

  const getTimeLeft = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    return endTime - now;
  };

  const sortedTokens = {
    ending_soon: presaleTokens.filter(t => t.status === 'active' && getTimeLeft(t.endTime) < 24 * 3600),
    active: presaleTokens.filter(t => t.status === 'active' && getTimeLeft(t.endTime) >= 24 * 3600),
    upcoming: presaleTokens.filter(t => t.status === 'pending'),
    ended: presaleTokens.filter(t => t.status === 'ended')
  };

  const tabConfig = {
    ending_soon: { label: '🔥 Ending Soon', color: 'text-red-500 border-red-500' },
    active: { label: '🟢 Active', color: 'text-green-500 border-green-500' },
    upcoming: { label: '🔜 Upcoming', color: 'text-blue-500 border-blue-500' },
    ended: { label: '⏳ Ended', color: 'text-gray-500 border-gray-500' }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Token Presales</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-white">Token Presales</h1>
          <NetworkIndicator />
        </div>

        <div className="max-w-[66.666667%] mx-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-4">
            {Object.entries(tabConfig).map(([key, config]) => (
              <button
                key={key}
                className={`px-4 py-2 -mb-px font-medium ${
                  activeTab === key 
                    ? `${config.color} border-b-2` 
                    : 'text-gray-400 border-transparent'
                } hover:text-gray-300 transition-colors`}
                onClick={() => setActiveTab(key as keyof typeof sortedTokens)}
              >
                {config.label}
                {sortedTokens[key as keyof typeof sortedTokens].length > 0 && (
                  <span className="ml-2 text-xs">
                    ({sortedTokens[key as keyof typeof sortedTokens].length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <div className="space-y-1">
            {sortedTokens[activeTab].map((token) => (
              <TokenSaleCard
                key={token.address}
                name={token.name}
                symbol={token.symbol}
                address={token.address}
                presale={{
                  softCap: token.softCap,
                  hardCap: token.hardCap,
                  minContribution: token.minContribution,
                  maxContribution: token.maxContribution,
                  presaleRate: token.presaleRate,
                  startTime: token.startTime,
                  endTime: token.endTime,
                  totalContributed: token.totalContributed,
                  isWhitelistEnabled: token.isWhitelistEnabled,
                  userContribution: token.userContribution,
                  isWhitelisted: token.isWhitelisted
                }}
                progress={(Number(token.totalContributed) / Number(token.hardCap)) * 100}
                status={mapPresaleStatus(token.status)}
                showBuyButton={activeTab !== 'ended'}
                glowEffect={activeTab === 'ending_soon' ? 'danger' : activeTab === 'active' ? 'success' : 'none'}
              />
            ))}
          </div>

          {/* Token Listing Cards Section */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Listed Tokens</h2>
            <div className="space-y-4">
              <TokenListingCard
                name="Sample Listed Token 1"
                symbol="SLT1"
                price="0.05"
                supply="1,000,000"
                description="A sample listed token with active trading."
                progress={75}
                status="live"
              />
              <TokenListingCard
                name="Sample Listed Token 2"
                symbol="SLT2"
                price="0.02"
                supply="500,000"
                description="Another sample token available for trading."
                progress={45}
                status="live"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 