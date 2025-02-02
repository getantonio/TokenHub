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

  // Set default allocations for v1 and v2
  const defaultAllocations = {
    presaleAllocation: 50,
    liquidityAllocation: 40,
    teamAllocation: 0,
    marketingAllocation: 0,
    developerAllocation: 10
  };

  const allocations = {
    presaleAllocation: defaultAllocations.presaleAllocation,
    liquidityAllocation: defaultAllocations.liquidityAllocation,
    teamAllocation: defaultAllocations.teamAllocation,
    marketingAllocation: defaultAllocations.marketingAllocation,
    developerAllocation: defaultAllocations.developerAllocation
  };

  // Calculate USD price
  const getUsdPrice = () => {
    if (!config.initialPrice || !ethPrice) return null;
    const usdPrice = Number(config.initialPrice) * ethPrice;
    return usdPrice < 0.01 ? usdPrice.toExponential(2) : usdPrice.toFixed(2);
  };

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <CardHeader className="py-2 border-b border-gray-700">
        <CardTitle className="text-sm font-semibold text-white">Token Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-3">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
            <span className="text-gray-400">Name:</span>
            <span className="text-white font-medium">{config.name || '-'}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
            <span className="text-gray-400">Symbol:</span>
            <span className="text-white font-medium">{config.symbol || '-'}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
            <span className="text-gray-400">Supply:</span>
            <span className="text-white font-medium">{config.totalSupply ? formatNumber(Number(config.totalSupply)) : '-'}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
            <span className="text-gray-400">Price:</span>
            <span className="text-white font-medium">
              {config.initialPrice ? (
                <>
                  {config.initialPrice} ETH
                  <span className="text-gray-400 ml-1">
                    (${getUsdPrice()})
                  </span>
                </>
              ) : '-'}
            </span>
          </div>
        </div>

        {/* Distribution Graph */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-text-primary">Token Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Total Supply</p>
                <p className="text-lg font-bold text-text-primary">{Number(config.totalSupply).toLocaleString()} {config.symbol}</p>
              </div>
              {/* Temporarily disabled until wallet distribution is implemented
              <div>
                <p className="text-sm text-text-secondary">Distribution</p>
                <p className="text-lg font-bold text-text-primary">100% to Creator</p>
              </div>
              */}
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {!isValid && validationErrors.length > 0 && (
          <div className="mt-2 p-2 bg-red-900/50 rounded-lg border border-red-700">
            <h4 className="text-xs font-medium text-red-400 mb-1">Validation Errors:</h4>
            <ul className="text-xs space-y-0.5">
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