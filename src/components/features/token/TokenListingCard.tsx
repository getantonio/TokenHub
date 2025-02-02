import { useState } from 'react';

interface TokenListingProps {
  name: string;
  symbol: string;
  price: string;
  supply: string;
  description: string;
  progress: number;
  status: 'live' | 'upcoming' | 'ended';
}

export function TokenListingCard({
  name,
  symbol,
  price,
  supply,
  description,
  progress,
  status
}: TokenListingProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        return 'Sale Live';
      case 'upcoming':
        return 'Coming Soon';
      case 'ended':
        return 'Sale Ended';
      default:
        return status;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl">
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer flex justify-between items-center border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="bg-gray-700 rounded-full p-2">
            <span className="text-2xl">{symbol.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-sm text-gray-400">{symbol}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className={getStatusColor(status)}>
            {getStatusText(status)}
          </div>
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expandable Content */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-gray-300 text-sm">{description}</p>

          {/* Token Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Price</p>
              <p className="text-white font-medium">{price} ETH</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Supply</p>
              <p className="text-white font-medium">{supply}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action Button */}
          {status === 'live' && (
            <button 
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              Buy Token
            </button>
          )}
          {status === 'upcoming' && (
            <button 
              className="w-full py-2 px-4 bg-gray-700 text-gray-300 rounded-lg cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
          )}
          {status === 'ended' && (
            <button 
              className="w-full py-2 px-4 bg-gray-700 text-gray-300 rounded-lg cursor-not-allowed"
              disabled
            >
              Sale Ended
            </button>
          )}
        </div>
      </div>
    </div>
  );
}