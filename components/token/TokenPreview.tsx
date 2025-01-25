"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenConfig } from './types';
import { formatNumber } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { tooltips } from './tooltips';

interface TokenPreviewProps {
  config: TokenConfig;
  isValid: boolean;
  validationErrors: string[];
}

export const TokenPreview: React.FC<TokenPreviewProps> = ({ 
  config, 
  isValid, 
  validationErrors 
}) => {
  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation;

  const PreviewItem = ({ label, value, tooltip }: { label: string; value: string; tooltip: string }) => (
    <div>
      <Tooltip content={tooltip}>
        <span className="text-gray-400">{label}:</span>
      </Tooltip>
      <p>{value}</p>
    </div>
  );

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">Token Preview</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">Token Information</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <PreviewItem 
                label="Name" 
                value={config.name || 'Not set'} 
                tooltip={tooltips.name}
              />
              <div>
                <span className="text-gray-400">Symbol:</span>
                <p>{config.symbol || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Tokenomics</h3>
            <div className="space-y-1">
              <div>
                <span className="text-gray-400">Total Supply:</span>
                <p>{formatNumber(Number(config.totalSupply)) || 'Not set'}</p>
              </div>
              <div>
                <span className="text-gray-400">Initial Price:</span>
                <p>{config.initialPrice ? `${config.initialPrice} ETH` : 'Not set'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Distribution</h3>
            <div className="space-y-1">
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full flex"
                  style={{ width: '100%' }}
                >
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${config.presaleAllocation}%` }}
                    title="Presale"
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${config.liquidityAllocation}%` }}
                    title="Liquidity"
                  />
                  <div 
                    className="bg-yellow-500" 
                    style={{ width: `${config.teamAllocation}%` }}
                    title="Team"
                  />
                  <div 
                    className="bg-purple-500" 
                    style={{ width: `${config.marketingAllocation}%` }}
                    title="Marketing"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="inline-block w-2 h-2 bg-blue-500 mr-1" />
                  Presale: {config.presaleAllocation}%
                </div>
                <div>
                  <span className="inline-block w-2 h-2 bg-green-500 mr-1" />
                  Liquidity: {config.liquidityAllocation}%
                </div>
                <div>
                  <span className="inline-block w-2 h-2 bg-yellow-500 mr-1" />
                  Team: {config.teamAllocation}%
                </div>
                <div>
                  <span className="inline-block w-2 h-2 bg-purple-500 mr-1" />
                  Marketing: {config.marketingAllocation}%
                </div>
              </div>
              {totalAllocation !== 100 && (
                <p className="text-red-400 text-xs">
                  Total allocation must equal 100% (currently {totalAllocation}%)
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Security Features</h3>
            <div className="space-y-0.5 text-xs">
              <p>
                <span className="text-gray-400">Max Transfer:</span>{' '}
                {config.maxTransferAmount ? `${config.maxTransferAmount}% of total supply` : 'No limit'}
              </p>
              <p>
                <span className="text-gray-400">Anti-Bot:</span>{' '}
                {config.antiBot ? 'Enabled' : 'Disabled'}
              </p>
              <p>
                <span className="text-gray-400">Initial Transfers:</span>{' '}
                {config.transfersEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-2 p-2 bg-red-900/50 rounded-lg">
              <h4 className="text-red-400 font-medium text-xs mb-1">Please fix:</h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-300">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 