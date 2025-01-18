export interface TokenConfig {
  // Basic Info
  name: string;
  symbol: string;
  description: string;
  website: string;

  // Tokenomics
  totalSupply: string;
  decimals: number;
  initialPrice: string;

  // Distribution
  presaleAllocation: number;
  liquidityAllocation: number;
  teamAllocation: number;
  marketingAllocation: number;
  developerAllocation: number;

  // Security Settings
  maxTransferAmount: string;
  cooldownTime: number;
  transfersEnabled: boolean;
  antiBot: boolean;

  // Advanced
  vestingSchedule: {
    team: {
      duration: number;
      cliff: number;
    };
    advisors: {
      duration: number;
      cliff: number;
    };
  };

  // Team Wallet
  teamWallet: string;

  // Developer Wallet
  developerWallet?: string;

  // Developer Vesting
  developerVesting?: {
    duration: number;
    cliff: number;
  };
}

// Add SecurityRisk type
export interface SecurityRisk {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  impact: string;
  mitigation: string;
  details: string[];
} 