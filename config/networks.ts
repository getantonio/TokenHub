export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  factoryAddressEnvKey: string;
  isTestnet: boolean;
  version: 'v1' | 'v2';
  currency: string;
}

export const SUPPORTED_NETWORKS: { [key: string]: NetworkConfig } = {
  'sepolia': {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/${INFURA_KEY}',
    explorerUrl: 'https://sepolia.etherscan.io',
    factoryAddressEnvKey: 'NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1',
    isTestnet: true,
    version: 'v1',
    currency: 'ETH'
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    factoryAddressEnvKey: 'NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS_V1',
    isTestnet: true,
    version: 'v1',
    currency: 'ETH'
  },
  'op-sepolia': {
    name: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    factoryAddressEnvKey: 'NEXT_PUBLIC_OP_SEPOLIA_FACTORY_ADDRESS_V1',
    isTestnet: true,
    version: 'v1',
    currency: 'ETH'
  },
  'polygon-amoy': {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://www.oklink.com/amoy',
    factoryAddressEnvKey: 'NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS_V1',
    isTestnet: true,
    version: 'v1',
    currency: 'MATIC'
  }
};

export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return Object.values(SUPPORTED_NETWORKS).find(network => network.chainId === chainId);
};

export const getNetworkByName = (name: string): NetworkConfig | undefined => {
  return SUPPORTED_NETWORKS[name];
};

// Helper to get explorer URL for a transaction or address
export const getExplorerUrl = (chainId: number, hash: string, type: 'tx' | 'address' | 'token' = 'tx'): string => {
  const network = getNetworkConfig(chainId);
  if (!network) return '';
  
  const baseUrl = network.explorerUrl;
  if (network.chainId === 80002) { // Polygon Amoy uses OKLink
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${hash}`;
      case 'token':
        return `${baseUrl}/token/${hash}`;
      case 'address':
        return `${baseUrl}/address/${hash}`;
    }
  } else { // Other networks use Etherscan-like explorers
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${hash}`;
      case 'address':
      case 'token':
        return `${baseUrl}/token/${hash}`;
    }
  }
  return '';
}; 