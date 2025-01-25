import { TokenConfig } from '@/components/token/types';

export const formatNumber = (num: number): string => {
  if (isNaN(num)) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
};

export const validateTokenConfig = (config: TokenConfig): string[] => {
  const errors: string[] = [];

  // Basic validation
  if (!config.name) errors.push('Token name is required');
  if (!config.symbol) errors.push('Token symbol is required');
  if (config.symbol && config.symbol.length > 6) errors.push('Symbol should be 6 characters or less');

  // Tokenomics validation
  if (!config.totalSupply) errors.push('Total supply is required');
  if (!config.initialPrice) errors.push('Initial price is required');

  // Distribution validation
  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation;
  
  if (totalAllocation !== 100) {
    errors.push('Total token allocation must equal 100%');
  }

  // Vesting validation
  if (config.vestingSchedule.team.duration < config.vestingSchedule.team.cliff) {
    errors.push('Team vesting duration must be greater than cliff period');
  }

  return errors;
}; 