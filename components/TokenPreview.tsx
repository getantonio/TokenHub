import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TokenConfig } from './types';
import { formatNumber } from '../lib/utils';
import { Tooltip } from './ui/tooltip';

interface TokenPreviewProps {
  config: TokenConfig;
  isValid: boolean;
  validationErrors: string[];
}

export function TokenPreview({ config, isValid, validationErrors }: TokenPreviewProps) {
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch ETH price');
        }
        
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(2000); // Default price
      }
    };

    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total allocation
  const totalAllocation = 
    Number(config.presaleAllocation) + 
    Number(config.liquidityAllocation) + 
    Number(config.teamAllocation) + 
    Number(config.marketingAllocation) +
    Number(config.developerAllocation);

  // Calculate USD price
  const getUsdPrice = () => {
    if (!config.initialPrice || !ethPrice) return null;
    const usdPrice = Number(config.initialPrice) * ethPrice;
    return usdPrice < 0.01 ? usdPrice.toExponential(2) : usdPrice.toFixed(2);
  };

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <CardHeader className="py-3 border-b border-gray-700">
        <CardTitle className="text-lg font-semibold text-white">Token Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-gray-400">Name:</span>
            <span className="text-white font-medium">{config.name || '-'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-gray-400">Symbol:</span>
            <span className="text-white font-medium">{config.symbol || '-'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-gray-400">Total Supply:</span>
            <span className="text-white font-medium">{config.totalSupply ? formatNumber(Number(config.totalSupply)) : '-'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-gray-400">Initial Price:</span>
            <span className="text-white font-medium">
              {config.initialPrice ? (
                <>
                  {config.initialPrice} ETH
                  <span className="text-gray-400 ml-2">
                    (${getUsdPrice()})
                  </span>
                </>
              ) : '-'}
            </span>
          </div>
        </div>

        {/* Distribution Graph */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Token Distribution</h3>
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-300">
            <div>Presale ({config.presaleAllocation}%)</div>
            <div>Liquidity ({config.liquidityAllocation}%)</div>
            <div>Team ({config.teamAllocation}%)</div>
            <div>Marketing ({config.marketingAllocation}%)</div>
            <div>Creator ({config.developerAllocation}%)</div>
          </div>
          <div className="text-xs text-gray-400">Total: {totalAllocation}%</div>
          
          {/* Distribution Bar */}
          <div className="h-4 w-full flex rounded overflow-hidden">
            <div 
              className="bg-blue-500" 
              style={{ width: `${config.presaleAllocation}%` }}
              title={`Presale: ${config.presaleAllocation}%`}
            />
            <div 
              className="bg-green-500" 
              style={{ width: `${config.liquidityAllocation}%` }}
              title={`Liquidity: ${config.liquidityAllocation}%`}
            />
            <div 
              className="bg-yellow-500" 
              style={{ width: `${config.teamAllocation}%` }}
              title={`Team: ${config.teamAllocation}%`}
            />
            <div 
              className="bg-purple-500" 
              style={{ width: `${config.marketingAllocation}%` }}
              title={`Marketing: ${config.marketingAllocation}%`}
            />
            <div 
              className="bg-red-500" 
              style={{ width: `${config.developerAllocation}%` }}
              title={`Creator: ${config.developerAllocation}%`}
            />
          </div>
        </div>

        {/* Validation Errors */}
        {!isValid && validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-900/50 rounded-lg border border-red-700">
            <h4 className="text-sm font-medium text-red-400 mb-2">Validation Errors:</h4>
            <ul className="text-sm space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i} className="text-red-300">• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}