import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { toast } from 'react-hot-toast';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { Button } from '@/components/ui/button';

interface TokenSaleCardProps {
  name: string;
  symbol: string;
  description?: string;
  address: string;
  price?: {
    eth: string;
    usd?: string;
    change24h?: number;
  };
  marketCap?: string;
  supply?: {
    total: string;
    forSale: string;
  };
  presale?: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    presaleRate: string;
    startTime: number;
    endTime: number;
    totalContributed: string;
    isWhitelistEnabled: boolean;
    userContribution?: string;
    isWhitelisted?: boolean;
  };
  progress: number;
  status: 'live' | 'upcoming' | 'ended';
  listedDate?: string;
  factoryVersion?: string;
  onContribute?: (amount: string) => Promise<void>;
  userAddress?: string;
  showBuyButton?: boolean;
  glowEffect?: 'success' | 'danger' | 'info' | 'none';
}

export function TokenSaleCard({
  name,
  symbol,
  description,
  address,
  price,
  marketCap,
  supply,
  presale,
  progress,
  status,
  listedDate,
  factoryVersion,
  onContribute,
  userAddress,
  showBuyButton = false,
  glowEffect = 'none'
}: TokenSaleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  // Simulate price movement flashes for listed tokens
  useEffect(() => {
    if (!presale && price) {
      const interval = setInterval(() => {
        const random = Math.random();
        if (random > 0.7) setPriceFlash('up');
        else if (random < 0.3) setPriceFlash('down');
        else setPriceFlash(null);
        
        setTimeout(() => setPriceFlash(null), 500);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [presale, price]);

  const getGlowStyle = () => {
    switch (glowEffect) {
      case 'success':
        return 'animate-glow-success shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'danger':
        return 'animate-glow-danger shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'info':
        return 'animate-glow-info shadow-[0_0_15px_rgba(59,130,246,0.3)]';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-green-400';
      case 'upcoming': return 'text-blue-400';
      case 'ended': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Live';
      case 'upcoming': return 'Soon';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  const getPriceChangeColor = () => {
    if (!price?.change24h) return 'text-gray-400';
    return price.change24h > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getPriceFlashStyle = () => {
    if (priceFlash === 'up') return 'shadow-[0_0_8px_rgba(34,197,94,0.5)]';
    if (priceFlash === 'down') return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    return '';
  };

  const handleContribute = async () => {
    if (!onContribute || !contributionAmount) return;
    
    try {
      setContributing(true);
      await onContribute(contributionAmount);
      setContributionAmount('');
    } catch (error) {
      console.error('Error contributing:', error);
      toast.error('Failed to contribute');
    } finally {
      setContributing(false);
    }
  };

  const formatTimeLeft = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-md overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 ${getGlowStyle()}`}>
      {/* Header - Always visible */}
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <TokenIcon address={address} size={32} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{name}</h3>
                <span className="text-sm text-gray-400">({symbol})</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                {price ? (
                  <>
                    <span className={`font-medium ${getPriceChangeColor()}`}>
                      {price.eth} ETH
                      {price.change24h && (
                        <span className="ml-1">
                          {price.change24h > 0 ? '+' : ''}{price.change24h}%
                        </span>
                      )}
                    </span>
                    {price.usd && (
                      <>
                        <span className="text-gray-400 opacity-50">•</span>
                        <span className="text-gray-400">${price.usd}</span>
                      </>
                    )}
                  </>
                ) : presale && (
                  <span className="text-gray-400">
                    Rate: {Number(presale.presaleRate).toLocaleString()} {symbol}/ETH
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {showBuyButton && status === 'live' && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                Buy Now
              </Button>
            )}
            <div className={`text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </div>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress Bar - Always visible */}
        <div className="mt-2 space-y-0.5">
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            {presale ? (
              <>
                <span>{Number(presale.totalContributed).toFixed(2)}/{Number(presale.hardCap).toFixed(2)} ETH</span>
                <span>{progress.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <span>{supply?.forSale} / {supply?.total}</span>
                <span>{progress}%</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        <div className="p-4 space-y-4 border-t border-gray-700/50">
          {description && (
            <p className="text-gray-300 text-sm">{description}</p>
          )}

          {/* Token Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {presale ? (
              <>
                <div>
                  <p className="text-gray-400">Soft Cap</p>
                  <p className="text-white">{Number(presale.softCap).toFixed(2)} ETH</p>
                </div>
                <div>
                  <p className="text-gray-400">Hard Cap</p>
                  <p className="text-white">{Number(presale.hardCap).toFixed(2)} ETH</p>
                </div>
                <div>
                  <p className="text-gray-400">Min Contribution</p>
                  <p className="text-white">{Number(presale.minContribution).toFixed(2)} ETH</p>
                </div>
                <div>
                  <p className="text-gray-400">Max Contribution</p>
                  <p className="text-white">{Number(presale.maxContribution).toFixed(2)} ETH</p>
                </div>
                {presale.isWhitelistEnabled && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Whitelist Status</p>
                    <p className={presale.isWhitelisted ? 'text-green-400' : 'text-red-400'}>
                      {presale.isWhitelisted ? 'Whitelisted' : 'Not Whitelisted'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {marketCap && (
                  <div>
                    <p className="text-gray-400">Market Cap</p>
                    <p className="text-white">${marketCap}</p>
                  </div>
                )}
                {listedDate && (
                  <div>
                    <p className="text-gray-400">Listed</p>
                    <p className="text-white">{listedDate}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contribution Section for Active Presales */}
          {presale && status === 'live' && userAddress && (
            <div className="space-y-2">
              {(!presale.isWhitelistEnabled || presale.isWhitelisted) && (
                <div>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      className="flex-1 px-3 py-2 bg-gray-700 rounded text-white text-sm"
                      min={Number(presale.minContribution)}
                      max={Number(presale.maxContribution)}
                      step="0.01"
                    />
                    <button
                      onClick={handleContribute}
                      disabled={contributing || !contributionAmount}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {contributing ? 'Contributing...' : 'Contribute'}
                    </button>
                  </div>
                  {presale.userContribution && Number(presale.userContribution) > 0 && (
                    <p className="text-sm text-gray-300">
                      Your contribution: {Number(presale.userContribution).toFixed(2)} ETH
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Time Remaining */}
          {presale && (
            <div>
              <p className="text-gray-400 text-sm">Time Remaining</p>
              <p className="text-white">
                {status === 'upcoming' 
                  ? `Starts in ${formatTimeLeft(presale.startTime)}`
                  : status === 'live'
                  ? formatTimeLeft(presale.endTime)
                  : 'Ended'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}