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
} 