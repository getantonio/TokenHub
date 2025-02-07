import { ChainId } from '@/types/chain';

interface ContractAddresses {
  factoryAddress: string;
  factoryAddressV2: string;
  factoryAddressV3: string;
}

export const contractAddresses: { [key: number]: ContractAddresses } = {
  11155111: { // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || ''
  },
  421614: { // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || ''
  },
  11155420: { // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || ''
  },
  80002: { // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || ''
  }
};

export function getNetworkContractAddress(chainId: number | string, contractName: keyof ContractAddresses): string | null {
  const chainIdNumber = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  const addresses = contractAddresses[chainIdNumber];
  return addresses ? addresses[contractName] : null;
}

export const FACTORY_ADDRESSES: Record<string, Record<number, string>> = {
  v1: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
  },
  v2: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
  },
  v3: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
  }
};

export default contractAddresses; 