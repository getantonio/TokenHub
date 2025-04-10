import { Chain } from 'viem';
import { polygonAmoy, bscMainnet, bscTestnet } from './chains';
import { ChainId, NetworkConfig, NetworkDex, SUPPORTED_NETWORKS as BASE_NETWORKS } from '../types/network';

const getFactoryAddressFromEnv = (chainId: ChainId): string => {
  const envKey = `NEXT_PUBLIC_FACTORY_ADDRESS_${chainId}`;
  return process.env[envKey] || '0x0000000000000000000000000000000000000000';
};

// Define DEX configurations
const BSC_MAINNET_DEX: NetworkDex = {
  QUICKSWAP_ROUTER: process.env.NEXT_PUBLIC_BSC_PANCAKESWAP_ROUTER || '',
  QUICKSWAP_FACTORY: process.env.NEXT_PUBLIC_BSC_PANCAKESWAP_FACTORY || '',
  QUICKSWAP_WETH: process.env.NEXT_PUBLIC_BSC_WBNB || '',
  SUPPORTS_ENS: false
};

const BSC_TESTNET_DEX: NetworkDex = {
  QUICKSWAP_ROUTER: process.env.NEXT_PUBLIC_BSCTESTNET_PANCAKESWAP_ROUTER || '',
  QUICKSWAP_FACTORY: process.env.NEXT_PUBLIC_BSCTESTNET_PANCAKESWAP_FACTORY || '',
  QUICKSWAP_WETH: process.env.NEXT_PUBLIC_BSCTESTNET_WBNB || '',
  SUPPORTS_ENS: false
};

// Re-export the base network configurations with updated DEX settings
export const SUPPORTED_NETWORKS = {
  ...BASE_NETWORKS,
  [ChainId.BSC_MAINNET]: {
    ...BASE_NETWORKS[ChainId.BSC_MAINNET],
    dex: BSC_MAINNET_DEX
  },
  [ChainId.BSC_TESTNET]: {
    ...BASE_NETWORKS[ChainId.BSC_TESTNET],
    dex: BSC_TESTNET_DEX
  },
  [ChainId.ETHEREUM]: {
    id: ChainId.ETHEREUM,
    name: 'Ethereum',
    factoryAddress: getFactoryAddressFromEnv(ChainId.ETHEREUM),
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    testnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://etherscan.io' },
    },
    UNISWAP_ROUTER: '0x...',
    UNISWAP_FACTORY: '0x...',
    UNISWAP_WETH: '0x...',
  },
  [ChainId.SEPOLIA]: {
    id: ChainId.SEPOLIA,
    name: 'Sepolia',
    factoryAddress: getFactoryAddressFromEnv(ChainId.SEPOLIA),
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    testnet: true,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
    UNISWAP_ROUTER: '0x...',
    UNISWAP_FACTORY: '0x...',
    UNISWAP_WETH: '0x...',
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    id: ChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    factoryAddress: getFactoryAddressFromEnv(ChainId.ARBITRUM_SEPOLIA),
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: 'https://arbitrum-sepolia.infura.io/v3/',
    testnet: true,
    nativeCurrency: {
      name: 'Arbitrum Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorers: {
      default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
    },
    UNISWAP_ROUTER: '0x...',
    UNISWAP_FACTORY: '0x...',
    UNISWAP_WETH: '0x...',
  },
  [ChainId.OPTIMISM_SEPOLIA]: {
    id: ChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    factoryAddress: getFactoryAddressFromEnv(ChainId.OPTIMISM_SEPOLIA),
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: 'https://optimism-sepolia.infura.io/v3/',
    testnet: true,
    nativeCurrency: {
      name: 'Optimism Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia-optimism.etherscan.io' },
    },
    UNISWAP_ROUTER: '0x...',
    UNISWAP_FACTORY: '0x...',
    UNISWAP_WETH: '0x...',
  },
} as const;

// Network utility functions
export const getNetworkConfig = (chainId: ChainId | null): NetworkConfig => {
  if (!chainId) {
    // Return default network config when chainId is null
    return SUPPORTED_NETWORKS[ChainId.POLYGON_AMOY];
  }
  const network = SUPPORTED_NETWORKS[chainId];
  if (!network) {
    console.warn(`Network config not found for chainId: ${chainId}`);
    return SUPPORTED_NETWORKS[ChainId.POLYGON_AMOY];
  }
  return network;
};

export const getExplorerUrl = (chainId: ChainId | null): string => {
  const network = getNetworkConfig(chainId);
  return network.explorerUrl;
};

export const getNetworkName = (chainId: ChainId | null): string => {
  const network = getNetworkConfig(chainId);
  return network.name;
};

export const getRpcUrl = (chainId: ChainId | null): string => {
  const network = getNetworkConfig(chainId);
  return network.rpcUrl;
};

export const getFactoryAddress = (chainId: ChainId | null): string => {
  const network = getNetworkConfig(chainId);
  return network.factoryAddress;
};

export const isTestnet = (chainId: ChainId | null): boolean => {
  const network = getNetworkConfig(chainId);
  return network.testnet;
};

export const getNativeCurrency = (chainId: ChainId | null) => {
  const network = getNetworkConfig(chainId);
  return network.nativeCurrency;
};

export const getExplorerName = (chainId: ChainId | undefined | null): string => {
  if (!chainId) return 'Explorer';
  const network = getNetworkConfig(chainId);
  return network.blockExplorers.default.name;
};

// Type exports
export type SupportedNetworkId = ChainId;
export type SupportedNetworkName = keyof typeof SUPPORTED_NETWORKS;