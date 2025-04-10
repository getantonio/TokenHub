import { Chain } from 'viem';

export enum ChainId {
  ETHEREUM = 1,
  SEPOLIA = 11155111,
  ARBITRUM_SEPOLIA = 421614,
  OPTIMISM_SEPOLIA = 11155420,
  POLYGON_AMOY = 80002,
  BSC_TESTNET = 97,
  BSC_MAINNET = 56
}

export interface NetworkContracts {
  factory?: string;
  priceOracle?: string;
  interestRateModel?: string;
  feeCollector?: string;
  lendingPoolImpl?: string;
  loanPoolFactory?: string;
}

export interface NetworkDex {
  QUICKSWAP_ROUTER?: string;
  QUICKSWAP_FACTORY?: string;
  QUICKSWAP_WETH?: string;
  SUPPORTS_ENS: boolean;
}

export interface NetworkConfig {
  id: ChainId;
  name: string;
  factoryAddress: string;
  explorerUrl: string;
  rpcUrl: string;
  testnet: boolean;
  contracts?: NetworkContracts;
  dex?: NetworkDex;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
}

export type SupportedNetworkId = ChainId;
export type SupportedNetworkName = keyof typeof SUPPORTED_NETWORKS;

export const DEFAULT_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000';

export const SUPPORTED_NETWORKS: Record<ChainId, NetworkConfig> = {
  [ChainId.POLYGON_AMOY]: {
    id: ChainId.POLYGON_AMOY,
    name: 'Polygon Amoy',
    factoryAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://www.oklink.com/amoy',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'AMOY',
      symbol: 'AMOY',
    },
    blockExplorers: {
      default: {
        name: 'OKLink',
        url: 'https://www.oklink.com/amoy',
      },
    },
    dex: {
      QUICKSWAP_ROUTER: process.env.NEXT_PUBLIC_POLYGONAMOY_QUICKSWAP_ROUTER || '',
      QUICKSWAP_FACTORY: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_FACTORY || '',
      QUICKSWAP_WETH: process.env.NEXT_PUBLIC_POLYGONAMOY_WETH || '',
      SUPPORTS_ENS: false
    }
  },
  [ChainId.BSC_MAINNET]: {
    id: ChainId.BSC_MAINNET,
    name: 'BNB Smart Chain',
    factoryAddress: process.env.NEXT_PUBLIC_BSC_MAINNET_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://bscscan.com',
    rpcUrl: process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
    testnet: false,
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'BNB',
    },
    blockExplorers: {
      default: {
        name: 'BscScan',
        url: 'https://bscscan.com',
      },
    }
  },
  [ChainId.BSC_TESTNET]: {
    id: ChainId.BSC_TESTNET,
    name: 'BSC Testnet',
    factoryAddress: process.env.NEXT_PUBLIC_BSC_TESTNET_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://testnet.bscscan.com',
    rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'tBNB',
    },
    blockExplorers: {
      default: {
        name: 'BscScan',
        url: 'https://testnet.bscscan.com',
      },
    }
  },
  [ChainId.SEPOLIA]: {
    id: ChainId.SEPOLIA,
    name: 'Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://sepolia.etherscan.io',
      },
    }
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    id: ChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Arbiscan',
        url: 'https://sepolia.arbiscan.io',
      },
    }
  },
  [ChainId.OPTIMISM_SEPOLIA]: {
    id: ChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://sepolia-optimism.etherscan.io',
      },
    }
  },
  [ChainId.ETHEREUM]: {
    id: ChainId.ETHEREUM,
    name: 'Ethereum',
    factoryAddress: process.env.NEXT_PUBLIC_ETHEREUM_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    testnet: false,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://etherscan.io',
      },
    }
  }
} as const;

export const DEFAULT_NETWORK = ChainId.POLYGON_AMOY;

// Utility functions
export const getNetworkConfig = (chainId: ChainId): NetworkConfig => {
  const network = SUPPORTED_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  return network;
};

export const getExplorerUrl = (chainId: ChainId): string => {
  return getNetworkConfig(chainId).explorerUrl;
};

export const getNetworkName = (chainId: ChainId): string => {
  return getNetworkConfig(chainId).name;
};

export const getRpcUrl = (chainId: ChainId): string => {
  return getNetworkConfig(chainId).rpcUrl;
};

export const getFactoryAddress = (chainId: ChainId): string => {
  return getNetworkConfig(chainId).factoryAddress;
};

export const isTestnet = (chainId: ChainId): boolean => {
  return getNetworkConfig(chainId).testnet;
};

export const getNativeCurrency = (chainId: ChainId): NetworkConfig['nativeCurrency'] => {
  return getNetworkConfig(chainId).nativeCurrency;
}; 