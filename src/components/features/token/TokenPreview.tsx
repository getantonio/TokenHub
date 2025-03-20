import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@utils/cn';

export interface WalletEntry {
  name: string;
  address: string;
  percentage: number;
  vestingEnabled?: boolean;
  vestingDuration?: number;
  cliffDuration?: number;
}

interface TokenPreviewProps {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  presaleEnabled?: boolean;
  presalePercentage?: number;
  liquidityPercentage?: number;
  wallets?: WalletEntry[];
  className?: string;
}

const getWalletColor = (index: number) => {
  const colors = [
    '#10B981', // emerald-500 (liquidity)
    '#3B82F6', // blue-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
  ];
  return colors[index % colors.length];
};

export default function TokenPreview({
  name,
  symbol,
  initialSupply,
  maxSupply,
  presaleEnabled = false,
  presalePercentage = 0,
  liquidityPercentage = 0,
  wallets = [],
  className
}: TokenPreviewProps) {
  // Round all percentages to whole numbers for display
  const roundedWallets = wallets.map(wallet => ({
    ...wallet,
    percentage: Math.round(wallet.percentage)
  }));
  
  const roundedPresalePercentage = Math.round(presaleEnabled ? presalePercentage : 0);
  const roundedLiquidityPercentage = Math.round(liquidityPercentage);
  
  // Calculate total percentage and check if valid
  const totalPercentage = roundedPresalePercentage + roundedLiquidityPercentage + 
    roundedWallets.reduce((sum, w) => sum + w.percentage, 0);
  const isValid = totalPercentage === 100;
  
  // Create distribution entries for visualization
  const distributionEntries = [
    ...(presaleEnabled && roundedPresalePercentage > 0 ? [{ name: 'Presale', percentage: roundedPresalePercentage }] : []),
    { name: 'Liquidity', percentage: roundedLiquidityPercentage },
    ...roundedWallets
  ].filter(entry => entry.percentage > 0); // Only show entries with percentage > 0

  return (
    <Card className={cn("w-full bg-gray-800 border-gray-700", className)}>
      <CardHeader className="py-2 border-b border-gray-700">
        <CardTitle className="text-sm font-semibold text-white">Token Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <span className="text-gray-400 text-sm">Name:</span>
              <p className="text-white font-medium">{name || '-'}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Symbol:</span>
              <p className="text-white font-medium">{symbol || '-'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400 text-sm">Initial Supply:</span>
              <p className="text-white font-medium">{initialSupply ? Number(initialSupply).toLocaleString() : '-'} {symbol}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Maximum Supply:</span>
              <p className="text-white font-medium">{maxSupply ? Number(maxSupply).toLocaleString() : '-'} {symbol}</p>
            </div>
          </div>
        </div>

        {/* Distribution Section */}
        <div className="space-y-4 pt-2 border-t border-gray-700 mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Distribution Breakdown</h3>
            <span className={`font-medium text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              {totalPercentage}%
            </span>
          </div>
          
          {/* Distribution Bar */}
          {distributionEntries.length > 0 && (
            <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex">
              {distributionEntries.map((segment, index) => (
                <div
                  key={index}
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: getWalletColor(index)
                  }}
                  className="h-full transition-all duration-300"
                  title={`${segment.name}: ${segment.percentage}%`}
                />
              ))}
            </div>
          )}
          
          {!isValid && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Total distribution must equal 100%
            </p>
          )}
          
          {/* Distribution Entries */}
          <div className="divide-y divide-gray-800 mt-2">
            {distributionEntries.map((entry, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 py-3 group"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getWalletColor(index) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate group-hover:text-gray-100 transition-colors">
                    {entry.name}
                  </p>
                  {'address' in entry && entry.address && (
                    <p className="text-xs text-gray-400 truncate">
                      {entry.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {entry.percentage}%
                  </span>
                  <div 
                    className="w-16 h-1 rounded-full"
                    style={{ backgroundColor: getWalletColor(index) }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Simple Status Indicator */}
          {isValid && (
            <div className="flex justify-end items-center mt-2">
              <div className="flex items-center gap-1 text-xs text-green-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Valid</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}