interface NetworkConfig {
  factoryAddress: string;
  isDeployed: boolean;
}

interface ContractConfig {
  [key: number]: NetworkConfig;
}

const SUPPORTED_NETWORKS = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet'
} as const;

const getContractAddress = (envKey: string): NetworkConfig => {
  // Only run on client side
  if (typeof window === 'undefined') {
    return { factoryAddress: '', isDeployed: false };
  }
  
  // Try Firebase config first (production)
  const firebaseConfig = (window as any).__FIREBASE_CONFIG__;
  if (firebaseConfig?.contracts?.[envKey.toLowerCase()]) {
    const address = firebaseConfig.contracts[envKey.toLowerCase()];
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    return { 
      factoryAddress: isValid ? address : '',
      isDeployed: isValid
    };
  }
  
  // Fallback to local env (development)
  const localAddress = process.env[`NEXT_PUBLIC_${envKey}_FACTORY_ADDRESS`] || '';
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(localAddress);
  return {
    factoryAddress: isValid ? localAddress : '',
    isDeployed: isValid
  };
};

// For development, we can override the deployed status
const isDev = process.env.NODE_ENV === 'development';
const contracts: ContractConfig = {
  1: { // Ethereum Mainnet
    ...getContractAddress('MAINNET'),
  },
  5: { // Goerli Testnet
    ...getContractAddress('GOERLI'),
  },
  11155111: { // Sepolia Testnet
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    isDeployed: isDev ? true : !!process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1,
  },
};

export const getNetworkContractAddress = (chainId: number, contractName: keyof NetworkConfig): string => {
  const network = contracts[chainId];
  if (!network) {
    throw new Error(`Network configuration not found for chainId: ${chainId}`);
  }
  
  if (!network.isDeployed) {
    throw new Error(`Contract not yet deployed on ${SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS]}`);
  }
  
  const address = network[contractName];
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid contract address for ${SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS]}`);
  }
  
  return address;
};

export const isNetworkConfigured = (chainId: number): boolean => {
  return chainId in contracts && contracts[chainId].isDeployed;
};

export { SUPPORTED_NETWORKS };
export default contracts; 