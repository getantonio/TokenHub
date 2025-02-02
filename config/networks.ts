import { ethers } from 'ethers';

export enum ChainId {
  MAINNET = 1,
  SEPOLIA = 11155111,
  POLYGON_AMOY = 80002,
  OP_SEPOLIA = 11155420,
  ARBITRUM_SEPOLIA = 421614
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: ChainId;
  explorerUrl: string;
  currency: string;
  isTestnet: boolean;
  contracts: {
    TokenFactory_v1?: string;
    TokenFactory_v2?: string;
  };
}

export const SUPPORTED_NETWORKS: Record<ChainId, NetworkConfig> = {
  [ChainId.MAINNET]: {
    name: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    chainId: ChainId.MAINNET,
    explorerUrl: 'https://etherscan.io',
    currency: 'ETH',
    isTestnet: false,
    contracts: {
      TokenFactory_v1: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS || ''
    }
  },
  [ChainId.SEPOLIA]: {
    name: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    chainId: ChainId.SEPOLIA,
    explorerUrl: 'https://sepolia.etherscan.io',
    currency: 'ETH',
    isTestnet: true,
    contracts: {
      TokenFactory_v1: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
      TokenFactory_v2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || ''
    }
  },
  [ChainId.POLYGON_AMOY]: {
    name: 'Polygon Amoy',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc.amoy.testnet.polygon.com',
    chainId: ChainId.POLYGON_AMOY,
    explorerUrl: 'https://www.oklink.com/amoy',
    currency: 'MATIC',
    isTestnet: true,
    contracts: {
      TokenFactory_v1: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS_V1 || '',
      TokenFactory_v2: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS_V2 || ''
    }
  },
  [ChainId.OP_SEPOLIA]: {
    name: 'OP Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    chainId: ChainId.OP_SEPOLIA,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    currency: 'ETH',
    isTestnet: true,
    contracts: {
      TokenFactory_v1: process.env.NEXT_PUBLIC_OP_SEPOLIA_FACTORY_ADDRESS_V1 || '',
      TokenFactory_v2: process.env.NEXT_PUBLIC_OP_SEPOLIA_FACTORY_ADDRESS_V2 || ''
    }
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: ChainId.ARBITRUM_SEPOLIA,
    explorerUrl: 'https://sepolia.arbiscan.io',
    currency: 'ETH',
    isTestnet: true,
    contracts: {
      TokenFactory_v1: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS_V1 || '',
      TokenFactory_v2: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS_V2 || ''
    }
  }
};

export function getExplorerUrl(chainId: ChainId | null, address: string, type: 'token' | 'address' | 'tx' = 'address'): string {
  if (!chainId) return '';
  const network = SUPPORTED_NETWORKS[chainId];
  if (!network) return '';
  return `${network.explorerUrl}/${type}/${address}`;
}

export function getContractAddress(chainId: ChainId | null, contractName: 'TokenFactory_v1' | 'TokenFactory_v2'): string {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }
  const network = SUPPORTED_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Network not found for chain ID ${chainId}`);
  }
  const address = network.contracts[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not found on network ${network.name}`);
  }
  return address;
}

export function getNetworkConfig(chainId: ChainId | null): NetworkConfig | null {
  if (!chainId) return null;
  return SUPPORTED_NETWORKS[chainId] || null;
}

export default SUPPORTED_NETWORKS; 