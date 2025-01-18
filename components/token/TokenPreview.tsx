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

export function TokenPreview({ config, isValid, validationErrors }: TokenPreviewProps) {
  // Calculate total allocation
  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation +
    config.developerAllocation;

  return (
    <Card className="w-full bg-gray-800 text-white">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">Token Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Basic Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Name:</span>
            <span>{config.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Symbol:</span>
            <span>{config.symbol || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Supply:</span>
            <span>{config.totalSupply || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Initial Price:</span>
            <span>{config.initialPrice ? `${config.initialPrice} ETH` : '-'}</span>
          </div>
        </div>

        {/* Distribution Graph */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Distribution</h3>
          <div className="w-full bg-gray-700 rounded-lg h-3 overflow-hidden">
            <div className="h-full flex">
              <div className="bg-blue-500 h-full" style={{ width: `${config.presaleAllocation}%` }} />
              <div className="bg-green-500 h-full" style={{ width: `${config.liquidityAllocation}%` }} />
              <div className="bg-yellow-500 h-full" style={{ width: `${config.teamAllocation}%` }} />
              <div className="bg-purple-500 h-full" style={{ width: `${config.marketingAllocation}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${config.developerAllocation}%` }} />
            </div>
          </div>

          {/* Distribution Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Presale ({config.presaleAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Liquidity ({config.liquidityAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span>Team ({config.teamAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span>Marketing ({config.marketingAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Developers ({config.developerAllocation}%)</span>
            </div>
          </div>

          <div className="text-sm mt-2">
            Total: {totalAllocation}%
            {totalAllocation !== 100 && (
              <span className="text-red-400 ml-2">(Must equal 100%)</span>
            )}
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