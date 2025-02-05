import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@utils/cn';

interface TokenPreviewProps {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  distributionSegments?: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  totalAllocation?: number;
  governanceConfig?: {
    votingDelay: number;
    votingPeriod: number;
    proposalThreshold: string;
    quorumNumerator: number;
    timelockDelay: number;
  };
  showGovernance?: boolean;
  className?: string;
}

export default function TokenPreview({
  name,
  symbol,
  initialSupply,
  maxSupply,
  distributionSegments = [],
  totalAllocation = 0,
  governanceConfig,
  showGovernance = false,
  className
}: TokenPreviewProps) {
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

        {/* Distribution Bar */}
        <div className="py-2">
          <h3 className="text-sm font-medium text-white mb-1">Token Distribution ({totalAllocation}%)</h3>
          <div className="w-full h-6 bg-gray-700 rounded-lg overflow-hidden flex">
            {distributionSegments.map((segment, index) => (
              <div
                key={index}
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.color
                }}
                className="h-full transition-all duration-300"
                title={`${segment.name}: ${segment.amount}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {distributionSegments.map((segment, index) => (
              <div key={index} className="flex items-center text-xs">
                <div
                  className="w-3 h-3 rounded mr-1"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-white">
                  {segment.name}: {segment.amount}%
                </span>
              </div>
            ))}
          </div>
          {totalAllocation > 100 && (
            <p className="text-red-500 text-xs mt-1">
              Total allocation exceeds 100%
            </p>
          )}
          {totalAllocation < 100 && totalAllocation > 0 && (
            <p className="text-yellow-500 text-xs mt-1">
              Remaining: {(100 - totalAllocation).toFixed(2)}%
            </p>
          )}
        </div>

        {showGovernance && governanceConfig && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-white mb-3">Governance Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400 text-sm">Voting Delay:</span>
                  <p className="text-white">{governanceConfig.votingDelay} days</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Voting Period:</span>
                  <p className="text-white">{governanceConfig.votingPeriod} days</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Proposal Threshold:</span>
                  <p className="text-white">{Number(governanceConfig.proposalThreshold).toLocaleString()} {symbol}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400 text-sm">Quorum:</span>
                  <p className="text-white">{governanceConfig.quorumNumerator}% of total supply</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Timelock Delay:</span>
                  <p className="text-white">{governanceConfig.timelockDelay} days</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}