import { ChainId } from './networks';

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

// Ensure the V2 factory address is correctly retrieved for Sepolia
const sepoliaV2Address = getNetworkContractAddress(ChainId.SEPOLIA, 'factoryAddressV2');
console.log('Sepolia V2 Factory Address:', sepoliaV2Address);

export default contractAddresses; 