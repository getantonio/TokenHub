interface NetworkConfig {
  factoryAddress: string;
}

interface NetworkConfigs {
  [chainId: number]: NetworkConfig;
}

export const SUPPORTED_NETWORKS: NetworkConfigs = {
  11155111: {  // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || ''
  },
  80002: {  // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS_V1 || ''
  },
  11155420: {  // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OP_SEPOLIA_FACTORY_ADDRESS_V1 || ''
  },
  421614: {  // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS_V1 || ''
  }
};

export const isNetworkConfigured = (chainId: number): boolean => {
  return chainId in SUPPORTED_NETWORKS && 
    SUPPORTED_NETWORKS[chainId].factoryAddress !== '';
};

export const getNetworkContractAddress = (chainId: number, contractType: 'factoryAddress'): string => {
  if (!isNetworkConfigured(chainId)) {
    throw new Error(`Network configuration not found for chainId: ${chainId}`);
  }
  return SUPPORTED_NETWORKS[chainId][contractType];
}; 