import { TokenConfig } from '@/components/token/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const formatNumber = (num: number): string => {
  if (isNaN(num)) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
};

export function validateTokenConfig(config: TokenConfig): string[] {
  const errors: string[] = [];

  // Basic validation
  if (!config.name) errors.push('Token name is required');
  if (!config.symbol) errors.push('Token symbol is required');
  if (!config.totalSupply) errors.push('Total supply is required');
  if (!config.initialPrice) errors.push('Initial price is required');

  // Distribution validation
  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation +
    config.developerAllocation;

  if (totalAllocation !== 100) {
    errors.push(`Total token allocation must equal 100% (currently ${totalAllocation}%)`);
  }

  // Update team allocation validation
  if (config.teamAllocation < 2) {
    errors.push('Team allocation must be at least 2% to cover platform fee');
  }

  // Marketing allocation validation
  if (config.marketingAllocation <= 0) {
    errors.push('Marketing allocation must be greater than 0%');
  }

  // Developer allocation validation
  if (config.developerAllocation < 5) {
    errors.push('Developer allocation should be at least 5%');
  }

  // Wallet validation
  if (!config.teamWallet) {
    errors.push('Team wallet address is required');
  }
  if (!config.marketingWallet) {
    errors.push('Marketing wallet address is required');
  }
  if (!config.developerWallet) {
    errors.push('Developer wallet address is required');
  }

  // Vesting validation
  if (config.vestingSchedule.team.duration < 6) {
    errors.push('Team vesting duration should be at least 6 months');
  }

  return errors;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 