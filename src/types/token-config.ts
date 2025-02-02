export interface TokenConfig {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals?: number;
  initialPrice?: string;
  blacklistEnabled?: boolean;
  timeLockEnabled?: boolean;
  presaleEnabled?: boolean;
  presaleAllocation?: number;
  liquidityAllocation?: number;
  teamAllocation?: number;
  marketingAllocation?: number;
  developerAllocation?: number;
  presaleConfig?: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    presaleRate: string;
    startTime: number;
    endTime: number;
    whitelistEnabled: boolean;
  };
}

export interface TokenDeploymentResult {
  success: boolean;
  tokenAddress?: string;
  error?: string;
  txHash?: string;
} 