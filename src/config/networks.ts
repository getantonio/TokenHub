import { ethers } from 'ethers';

export enum ChainId {
  SEPOLIA = 11155111,
  ARBITRUM_SEPOLIA = 421614,
  OPTIMISM_SEPOLIA = 11155420,
  POLYGON_AMOY = 80002
}

interface NetworkConfig {
  name: string;
  chainId: ChainId;
  explorerUrl: string;
  rpcUrl: string;
  currency: string;
  isTestnet: boolean;
}

export const networks: { [key in ChainId]: NetworkConfig } = {
  [ChainId.SEPOLIA]: {
    name: 'Sepolia',
    chainId: ChainId.SEPOLIA,
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    currency: 'ETH',
    isTestnet: true
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    name: 'Arbitrum Sepolia',
    chainId: ChainId.ARBITRUM_SEPOLIA,
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    currency: 'ETH',
    isTestnet: true
  },
  [ChainId.OPTIMISM_SEPOLIA]: {
    name: 'Optimism Sepolia',
    chainId: ChainId.OPTIMISM_SEPOLIA,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_OPSEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    currency: 'ETH',
    isTestnet: true
  },
  [ChainId.POLYGON_AMOY]: {
    name: 'Polygon Amoy',
    chainId: ChainId.POLYGON_AMOY,
    explorerUrl: 'https://www.oklink.com/amoy',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGONAMOY_RPC_URL || 'https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67',
    currency: 'MATIC',
    isTestnet: true
  }
};

export const SUPPORTED_NETWORKS = Object.values(networks);

export function getExplorerUrl(chainId: number | null, address: string, type: 'token' | 'address' | 'tx' = 'address'): string {
  if (!chainId) return '#';
  
  const network = networks[chainId as ChainId];
  if (!network) return '#';

  const baseUrl = network.explorerUrl;
  switch (type) {
    case 'token':
      return `${baseUrl}/token/${address}`;
    case 'tx':
      return `${baseUrl}/tx/${address}`;
    default:
      return `${baseUrl}/address/${address}`;
  }
}

export function getNetworkName(chainId: number | null): string {
  if (!chainId) return 'Unknown Network';
  return networks[chainId as ChainId]?.name || 'Unknown Network';
}

export function isTestnet(chainId: number | null): boolean {
  if (!chainId) return false;
  return networks[chainId as ChainId]?.isTestnet || false;
}

export function getNetworkConfig(chainId: number | null): NetworkConfig | null {
  if (!chainId) return null;
  return networks[chainId as ChainId] || null;
}

export default networks; 