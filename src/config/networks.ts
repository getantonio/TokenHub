import { mainnet, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { polygonAmoy, bscTestnet, bscMainnet } from './chains';
import { Chain } from 'viem';

type SupportedNetworks = {
  [key: number]: Chain;
};

export const SUPPORTED_NETWORKS: SupportedNetworks = {
  1: mainnet,
  11155111: sepolia,
  421614: arbitrumSepolia,
  11155420: optimismSepolia,
  80002: polygonAmoy,
  97: bscTestnet,
  56: bscMainnet,
} as const;

export const getExplorerUrl = (chainId: number | undefined, address: string, type: 'token' | 'address' | 'tx' = 'address') => {
  if (!chainId || !(chainId in SUPPORTED_NETWORKS)) return '#';
  
  const network = SUPPORTED_NETWORKS[chainId];
  const baseUrl = network?.blockExplorers?.default?.url;
  if (!baseUrl) return '#';

  switch (type) {
    case 'token':
      return `${baseUrl}/token/${address}`;
    case 'tx':
      return `${baseUrl}/tx/${address}`;
    default:
      return `${baseUrl}/address/${address}`;
  }
};

export const getExplorerName = (chainId: number | undefined) => {
  if (!chainId || !(chainId in SUPPORTED_NETWORKS)) return 'Explorer';
  
  const network = SUPPORTED_NETWORKS[chainId];
  return network?.blockExplorers?.default?.name || 'Explorer';
};

export const getRpcUrl = (chainId: number | undefined) => {
  if (!chainId || !(chainId in SUPPORTED_NETWORKS)) return undefined;
  
  const network = SUPPORTED_NETWORKS[chainId];
  return network?.rpcUrls?.default?.http[0];
};

export function getNetworkName(chainId: number | null): string {
  if (!chainId) return 'Unknown Network';
  return SUPPORTED_NETWORKS[chainId]?.name || 'Unknown Network';
}

export function isTestnet(chainId: number | null): boolean {
  if (!chainId) return false;
  return SUPPORTED_NETWORKS[chainId]?.testnet || false;
}

export function getNetworkConfig(chainId: number | null): any | null {
  if (!chainId) return null;
  return SUPPORTED_NETWORKS[chainId] || null;
}

export const NETWORK_CONFIG = {
  '80002': { // Polygon Amoy
    QUICKSWAP_ROUTER: process.env.NEXT_PUBLIC_POLYGONAMOY_QUICKSWAP_ROUTER,
    QUICKSWAP_FACTORY: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_FACTORY,
    QUICKSWAP_WETH: process.env.NEXT_PUBLIC_POLYGONAMOY_WETH,
    SUPPORTS_ENS: false,
    // Add other network-specific configurations as needed
  },
  // Add other networks as needed
} as const;

export type NetworkConfig = typeof NETWORK_CONFIG;
export type NetworkId = keyof NetworkConfig;

export default SUPPORTED_NETWORKS; 