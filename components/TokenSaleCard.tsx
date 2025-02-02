import { useState, useEffect } from 'react';

interface TokenSaleCardProps {
  name: string;
  symbol: string;
  description: string;
  price: {
    eth: string;
    usd: string;
    change24h: number;
  };
  marketCap: string;
  supply: {
    total: string;
    forSale: string;
  };
  raised: {
    current: string;
    target: string;
  };
  progress: number;
  status: 'live' | 'upcoming' | 'ended';
  startTime?: string;
  endTime?: string;
  listedDate: string;
  factoryVersion: string;
}

export function TokenSaleCard({
  name,
  symbol,
  description,
  price,
  marketCap,
  supply,
  raised,
  progress,
  status,
  startTime,
  endTime,
  listedDate,
  factoryVersion
}: TokenSaleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // Simulate price movement flashes
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.7) {
        setPriceFlash('up');
      } else if (random < 0.3) {
        setPriceFlash('down');
      } else {
        setPriceFlash(null);
      }
      
      // Clear flash after short duration
      setTimeout(() => setPriceFlash(null), 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'text-green-400';
      case 'upcoming':
        return 'text-blue-400';
      case 'ended':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live':
        return 'Live';
      case 'upcoming':
        return 'Soon';
      case 'ended':
        return 'Ended';
      default:
        return status;
    }
  };

  const getPriceChangeColor = () => {
    if (price.change24h > 0) return 'text-green-400';
    if (price.change24h < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPriceFlashStyle = () => {
    if (priceFlash === 'up') return 'shadow-[0_0_8px_rgba(34,197,94,0.5)]';
    if (priceFlash === 'down') return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    return '';
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-md overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 max-w-2xl mx-auto ${getPriceFlashStyle()}`}>
      {/* Header - Always visible */}
      <div 
        className="p-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-white">{symbol.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{name}</h3>
                <span className="text-sm text-gray-400">({symbol})</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-medium ${getPriceChangeColor()}`}>
                  {price.eth} ETH
                  <span className="ml-1">
                    {price.change24h > 0 ? '+' : ''}{price.change24h}%
                  </span>
                </span>
                <span className="text-gray-400 opacity-50">•</span>
                <span className="text-gray-400">${price.usd}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{raised.current}/{raised.target} ETH</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="p-2 space-y-3 border-t border-gray-700/50">
          {/* Description */}
          <p className="text-gray-300 text-xs">{description}</p>

          {/* Token Info Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Market Cap</p>
              <p className="text-white">${marketCap}</p>
            </div>
            <div>
              <p className="text-gray-400">Listed</p>
              <p className="text-white">{listedDate}</p>
            </div>
            <div>
              <p className="text-gray-400">Factory</p>
              <p className="text-white">v{factoryVersion}</p>
            </div>
          </div>

          <div className="flex justify-between items-end text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Supply</p>
                <p className="text-white">{supply.forSale} / {supply.total}</p>
              </div>
              <div>
                <p className="text-gray-400">Presale</p>
                <p className="text-white">{startTime?.split(' ')[0]} - {endTime?.split(' ')[0]}</p>
              </div>
            </div>

            {/* Action Button - Right aligned and 1/3 width */}
            {status === 'live' && (
              <button 
                className="w-32 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors duration-200 font-medium"
              >
                Buy Token
              </button>
            )}
            {status === 'upcoming' && (
              <button 
                className="w-32 py-1.5 px-3 bg-gray-700 text-gray-300 rounded text-sm cursor-not-allowed font-medium"
                disabled
              >
                Coming Soon
              </button>
            )}
            {status === 'ended' && (
              <button 
                className="w-32 py-1.5 px-3 bg-gray-700 text-gray-300 rounded text-sm cursor-not-allowed font-medium"
                disabled
              >
                Sale Ended
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}