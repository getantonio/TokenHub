export interface LendingContractAddresses {
  priceOracle?: string;
  interestRateModel?: string;
  feeCollector?: string;
  lendingPoolImpl?: string;
  loanPoolFactory?: string;
}

export interface LendingNetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string | undefined;
  explorerUrl: string;
  contracts: LendingContractAddresses;
}

export const LENDING_NETWORKS: Record<string, LendingNetworkConfig> = {
  polygonAmoy: {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL,
    explorerUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_EXPLORER_URL || "https://amoy.polygonscan.com",
    contracts: {
      priceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS,
      interestRateModel: process.env.NEXT_PUBLIC_INTEREST_RATE_MODEL_ADDRESS,
      feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS,
      lendingPoolImpl: process.env.NEXT_PUBLIC_LENDING_POOL_IMPL_ADDRESS,
      loanPoolFactory: process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS,
    },
  },
} as const;

export type LendingNetworkName = keyof typeof LENDING_NETWORKS;
export type LendingNetworkId = LendingNetworkConfig["chainId"];

export const DEFAULT_LENDING_NETWORK: LendingNetworkName = (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as LendingNetworkName) || "polygonAmoy"; 