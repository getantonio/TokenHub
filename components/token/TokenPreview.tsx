"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TokenConfig } from './types';
import { formatNumber } from '@/lib/utils';
import { Tooltip } from '../ui/tooltip';
import { tooltips } from './tooltips';

interface TokenPreviewProps {
  config: TokenConfig;
  isValid: boolean;
  validationErrors: string[];
}

export function TokenPreview({ config, isValid, validationErrors }: TokenPreviewProps) {
  // Calculate total allocation
  const totalAllocation = 
    Number(config.presaleAllocation) + 
    Number(config.liquidityAllocation) + 
    Number(config.teamAllocation) + 
    Number(config.marketingAllocation) +
    Number(config.developerAllocation);

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <CardHeader className="py-3 border-b border-gray-700">
        <CardTitle className="text-lg font-semibold text-white">Token Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Name:</span>
            <span className="text-white font-medium">{config.name || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Symbol:</span>
            <span className="text-white font-medium">{config.symbol || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Supply:</span>
            <span className="text-white font-medium">{config.totalSupply ? formatNumber(Number(config.totalSupply)) : '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Initial Price:</span>
            <span className="text-white font-medium">{config.initialPrice ? `${config.initialPrice} ETH` : '-'}</span>
          </div>
        </div>

        {/* Distribution Graph */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Distribution</h3>
          <div className="w-full bg-gray-700 rounded-lg h-3 overflow-hidden">
            <div className="h-full flex">
              <Tooltip content={tooltips.presaleAllocation}>
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${config.presaleAllocation}%` }} />
              </Tooltip>
              <Tooltip content={tooltips.liquidityAllocation}>
                <div className="bg-green-500 h-full transition-all" style={{ width: `${config.liquidityAllocation}%` }} />
              </Tooltip>
              <Tooltip content={tooltips.teamAllocation}>
                <div className="bg-yellow-500 h-full transition-all" style={{ width: `${config.teamAllocation}%` }} />
              </Tooltip>
              <Tooltip content={tooltips.marketingAllocation}>
                <div className="bg-purple-500 h-full transition-all" style={{ width: `${config.marketingAllocation}%` }} />
              </Tooltip>
              <Tooltip content={tooltips.developerAllocation}>
                <div className="bg-red-500 h-full transition-all" style={{ width: `${config.developerAllocation}%` }} />
              </Tooltip>
            </div>
          </div>

          {/* Distribution Legend */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-300">Presale ({config.presaleAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-300">Liquidity ({config.liquidityAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-gray-300">Team ({config.teamAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-gray-300">Marketing ({config.marketingAllocation}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-300">Developers ({config.developerAllocation}%)</span>
            </div>
          </div>

          <div className="text-sm mt-2 flex items-center gap-2">
            <span className="text-gray-300">Total: {totalAllocation}%</span>
            {totalAllocation !== 100 && (
              <span className="text-red-400">(Must equal 100%)</span>
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