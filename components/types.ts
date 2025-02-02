export interface TokenConfig {
  name: string;
  symbol: string;
  totalSupply: string;
  initialPrice: string;
  presaleAllocation: number;
  liquidityAllocation: number;
  teamAllocation: number;
  marketingAllocation: number;
  developerAllocation: number;
}

export interface ValidationError {
  field: string;
  message: string;
}