import { LendingNetworkName, LENDING_NETWORKS } from './lending-networks';

export const LENDING_CONTRACTS = {
  PRICE_ORACLE: "priceOracle",
  INTEREST_RATE_MODEL: "interestRateModel",
  FEE_COLLECTOR: "feeCollector",
  LENDING_POOL_IMPL: "lendingPoolImpl",
  LOAN_POOL_FACTORY: "loanPoolFactory",
} as const;

export type LendingContractName = keyof typeof LENDING_CONTRACTS;
export type LendingContractValue = typeof LENDING_CONTRACTS[LendingContractName];

export const getLendingContractAddress = (contractName: LendingContractValue, network: LendingNetworkName): string => {
  const networkConfig = LENDING_NETWORKS[network];
  if (!networkConfig) throw new Error(`Network ${network} not supported`);
  
  const contracts = networkConfig.contracts;
  if (!contracts) throw new Error(`No contracts configured for network ${network}`);
  
  const contractAddress = contracts[contractName];
  if (!contractAddress || typeof contractAddress !== 'string') {
    throw new Error(`Contract ${contractName} not found or invalid on network ${network}`);
  }
  
  return contractAddress;
}; 