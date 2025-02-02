import { useEffect, useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { Header } from '../components/Header';
import Head from 'next/head';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactory_v2_1_0 from '../contracts/abi/TokenFactory_v2.1.0.json';
import TokenTemplateV2 from '../contracts/abi/TokenTemplate_v2.1.0.json';
import { getNetworkContractAddress } from '../config/contracts';
import { getExplorerUrl } from '../config/networks';
import { Spinner } from '../components/ui/Spinner';
import { TokenIcon } from '../components/ui/TokenIcon';

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
}

export default function PresalePage() {
  const { chainId, isSupported } = useNetwork();
  const [presaleTokens, setPresaleTokens] = useState<PresaleToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);
  const categories = [
    'all',
    'ending-soon',
    'meme',
    'gamefi',
    'defi',
    'security'
  ];

  useEffect(() => {
    loadPresaleTokens();
  }, [chainId]);

  async function loadPresaleTokens() {
    if (!chainId || !isSupported) {
      setPresaleTokens([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('No ethereum provider found');
      }

      const provider = new BrowserProvider(window.ethereum);
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      
      if (!factoryAddress) {
        throw new Error('No V2 factory deployed on this network');
      }

      const factory = new Contract(factoryAddress, TokenFactory_v2_1_0.abi, provider);
      const deployedTokens = await factory.getDeployedTokens();

      const tokens: PresaleToken[] = [];

      for (const tokenAddress of deployedTokens) {
        try {
          const token = new Contract(tokenAddress, TokenTemplateV2.abi, provider);
          const [name, symbol, presaleStatus] = await Promise.all([
            token.name(),
            token.symbol(),
            token.getPresaleStatus()
          ]);

          const currentTime = Math.floor(Date.now() / 1000);
          let status: 'pending' | 'active' | 'ended';

          if (currentTime < presaleStatus.startTime) {
            status = 'pending';
          } else if (currentTime > presaleStatus.endTime || presaleStatus.finalized) {
            status = 'ended';
          } else {
            status = 'active';
          }

          tokens.push({
            address: tokenAddress,
            name,
            symbol,
            softCap: formatUnits(presaleStatus.softCap, 18),
            hardCap: formatUnits(presaleStatus.hardCap, 18),
            minContribution: formatUnits(presaleStatus.minContribution, 18),
            maxContribution: formatUnits(presaleStatus.maxContribution, 18),
            presaleRate: formatUnits(presaleStatus.presaleRate, 18),
            startTime: Number(presaleStatus.startTime),
            endTime: Number(presaleStatus.endTime),
            totalContributed: formatUnits(presaleStatus.totalContributed, 18),
            isWhitelistEnabled: presaleStatus.whitelistEnabled,
            status
          });
        } catch (error) {
          console.error('Error loading token:', error);
        }
      }

      setPresaleTokens(tokens);
    } catch (error) {
      console.error('Error loading presale tokens:', error);
      setError(error instanceof Error ? error.message : 'Failed to load presale tokens');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'ended':
        return 'status-ended';
      default:
        return '';
    }
  }

  const toggleExpand = (address: string) => {
    setExpandedToken(expandedToken === address ? null : address);
  };

  function getGlowColor(status: string) {
    switch (status) {
      case 'active':
        return 'from-green-500/10 to-green-500/5';
      case 'pending':
        return 'from-yellow-500/10 to-yellow-500/5';
      case 'ended':
        return 'from-red-500/10 to-red-500/5';
      default:
        return 'from-blue-500/10 to-purple-500/10';
    }
  }

  function formatCountdown(endTime: number) {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }

  function filterTokens(tokens: PresaleToken[]) {
    return tokens.filter(token => {
      if (hiddenTokens.includes(token.address)) return false;
      
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'ending-soon') {
        const timeLeft = token.endTime - Math.floor(Date.now() / 1000);
        return token.status === 'active' && timeLeft < 24 * 60 * 60; // Less than 24 hours
      }
      // Add more category filters here
      return true;
    });
  }

  function hideToken(address: string) {
    setHiddenTokens(prev => [...prev, address]);
  }

  function resetHiddenTokens() {
    setHiddenTokens([]);
  }

  function getProgressBarColor(progress: number) {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Presale</title>
        <meta name="description" content="View and participate in token presales" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header className="relative z-50" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Token Presales</h1>
              <p className="text-gray-400">View and participate in token presales</p>
            </div>
            {hiddenTokens.length > 0 && (
              <button
                onClick={resetHiddenTokens}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                Reset Hidden Tokens ({hiddenTokens.length})
              </button>
            )}
          </div>

          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-background-secondary text-gray-400 hover:text-white'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner className="w-8 h-8 text-blue-500" />
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-500">{error}</p>
            </div>
          ) : presaleTokens.length === 0 ? (
            <div className="bg-background-secondary rounded-lg p-6 text-center">
              <p className="text-gray-400">No active presales found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filterTokens(presaleTokens).map(token => {
                const progress = (Number(token.totalContributed) / Number(token.hardCap)) * 100;
                const progressBarColor = getProgressBarColor(progress);

                return (
                  <div key={token.address} 
                    className="relative bg-background-secondary rounded-lg border border-border hover:border-text-accent transition-colors overflow-hidden group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${getGlowColor(token.status)} opacity-0 group-hover:opacity-100 transition-opacity animate-glow`} />
                    
                    <div className="relative">
                      <div 
                        onClick={() => toggleExpand(token.address)}
                        className="flex items-center justify-between p-4 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <TokenIcon size={32} address={token.address} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-white">{token.name}</h3>
                              <span className="text-xs text-gray-400">{token.symbol}</span>
                              {token.isWhitelistEnabled && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                  Whitelist
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-0.5">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-400">Rate:</span>
                                <span className="text-xs text-white">{token.presaleRate} tokens/ETH</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-xs text-gray-400">
                              {token.status === 'active' && formatCountdown(token.endTime)}
                              {token.status === 'pending' && 'Starting Soon'}
                              {token.status === 'ended' && 'Ended'}
                            </div>
                            <div className="text-xs text-white mt-0.5">
                              {token.totalContributed} / {token.hardCap} ETH
                            </div>
                          </div>
                          <span className={`${getStatusBadgeClass(token.status)} text-xs px-2 py-1 rounded-full`}>
                            {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              hideToken(token.address);
                            }}
                            className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                            title="Hide token"
                          >
                            hide
                          </button>
                        </div>
                      </div>

                      {/* Progress bar - always visible */}
                      <div className="h-1 w-full bg-gray-700">
                        <div
                          className={`h-full ${progressBarColor} transition-all duration-500`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      
                      {/* Progress info - always visible */}
                      <div className="flex justify-between items-center px-4 py-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`${getStatusBadgeClass(token.status)} px-2 py-0.5 rounded-full`}>
                            {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                          </span>
                          <span className="text-white">{token.totalContributed} / {token.hardCap} ETH</span>
                        </div>
                      </div>

                      {expandedToken === token.address && (
                        <div className="px-4 pb-4 pt-3 border-t border-border">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Soft Cap</p>
                              <p className="text-sm font-medium text-white">{token.softCap} ETH</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Hard Cap</p>
                              <p className="text-sm font-medium text-white">{token.hardCap} ETH</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Min Contribution</p>
                              <p className="text-sm font-medium text-white">{token.minContribution} ETH</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Max Contribution</p>
                              <p className="text-sm font-medium text-white">{token.maxContribution} ETH</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-400">
                                {token.status === 'pending' 
                                  ? `Starts ${new Date(token.startTime * 1000).toLocaleDateString()}`
                                  : token.status === 'active'
                                  ? `Ends ${new Date(token.endTime * 1000).toLocaleDateString()}`
                                  : 'Presale Ended'}
                              </p>
                              {token.status === 'active' && Number(token.totalContributed) < Number(token.softCap) && (
                                <p className="text-xs text-yellow-400">
                                  Soft cap not reached yet. Current: {token.totalContributed} ETH / Required: {token.softCap} ETH
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <a
                                href={getExplorerUrl(chainId, token.address, 'token')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-text-accent hover:text-blue-400 transition-colors"
                              >
                                View on Explorer
                              </a>
                              <button
                                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                disabled={token.status !== 'active' || Number(token.totalContributed) < Number(token.softCap)}
                                title={Number(token.totalContributed) < Number(token.softCap) ? 'Soft cap must be reached before finalizing' : ''}
                              >
                                {token.status === 'pending' ? 'Starting Soon' : token.status === 'ended' ? 'Ended' : 'Contribute'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 