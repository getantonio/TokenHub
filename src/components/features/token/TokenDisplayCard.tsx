import { useState } from 'react';

interface TokenDisplayCardProps {
  title: string;
  description: string;
  tokenSymbol: string;
  supply: string;
  price: string;
  progress: number;
}

export function TokenDisplayCard({ title, description, tokenSymbol, supply, price, progress }: TokenDisplayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02]"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <span className="text-blue-400">{tokenSymbol}</span>
        </div>
        
        <div className={`space-y-4 transition-all duration-300 ${isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <p className="text-gray-400 text-sm">{description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Supply:</span>
              <span className="text-white">{supply}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price:</span>
              <span className="text-white">{price}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress:</span>
                <span className="text-white">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}