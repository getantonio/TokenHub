import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@utils/cn';

interface TokenPreviewProps {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
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