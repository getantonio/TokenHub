import { Card } from "@/components/ui/card";

export interface WalletEntry {
  name: string;
  address: string;
  percentage: number;
  vestingEnabled?: boolean;
  vestingDuration?: number;
  cliffDuration?: number;
}

export interface TokenDistributionPreviewProps {
  presaleEnabled: boolean;
  presalePercentage: number;
  liquidityPercentage: number;
  wallets: WalletEntry[];
}

const getWalletColor = (index: number) => {
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
  ];
  return colors[index % colors.length];
};

export function TokenDistributionPreview({ presaleEnabled, presalePercentage, liquidityPercentage, wallets }: TokenDistributionPreviewProps) {
  const totalPercentage = (presaleEnabled ? presalePercentage : 0) + liquidityPercentage + wallets.reduce((sum, w) => sum + w.percentage, 0);
  const isValid = totalPercentage === 100;

  const distributionEntries = [
    ...(presaleEnabled ? [{ name: 'Presale', percentage: presalePercentage }] : []),
    { name: 'Liquidity', percentage: liquidityPercentage },
    ...wallets
  ];

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-200">Total Distribution</span>
          <span className={`font-medium ${isValid ? 'text-green-400' : 'text-red-400'}`}>
            {totalPercentage}%
          </span>
        </div>
        
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex">
          {distributionEntries.map((entry, index) => (
            <div
              key={index}
              className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${entry.percentage}%`,
                backgroundColor: getWalletColor(index),
              }}
            />
          ))}
        </div>
        
        {!isValid && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Total distribution must equal 100%
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-200">Distribution Breakdown</div>
        <div className="divide-y divide-gray-800">
          {distributionEntries.map((entry, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 py-3 group"
            >
              <div
                className="w-2 h-2 rounded-full"
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
      </div>

      {/* Validation Status */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="text-sm text-gray-200">
          {isValid ? (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Distribution is valid
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Adjust percentages to total 100%
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 