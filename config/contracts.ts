import { ChainId } from './networks';

export interface ContractAddresses {
  factoryAddress: string;
  factoryAddressV2: string;
  tokenTemplateAddressV1?: string;
  tokenTemplateAddressV2?: string;
}

export const contractAddresses: Record<ChainId, ContractAddresses> = {
  [ChainId.MAINNET]: {
    factoryAddress: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS || '',
    factoryAddressV2: ''
  },
  [ChainId.SEPOLIA]: {
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_TEMPLATE_ADDRESS_V1 || '',
    tokenTemplateAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_TEMPLATE_ADDRESS_V2 || '',
  },
  [ChainId.POLYGON_AMOY]: {
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_TEMPLATE_ADDRESS_V1 || '',
    tokenTemplateAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_TEMPLATE_ADDRESS_V2 || ''
  },
  [ChainId.OP_SEPOLIA]: {
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_TEMPLATE_ADDRESS_V1 || '',
    tokenTemplateAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_TEMPLATE_ADDRESS_V2 || ''
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_TEMPLATE_ADDRESS_V1 || '',
    tokenTemplateAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_TEMPLATE_ADDRESS_V2 || ''
  }
};

export function getNetworkContractAddress(chainId: ChainId | null, contractName: keyof ContractAddresses): string {
  if (!chainId) {
    console.warn('No chain ID provided');
    return '';
  }

  const networkConfig = contractAddresses[chainId];
  if (!networkConfig) {
    console.warn(`No network configuration found for chain ID ${chainId}`);
    return '';
  }

  const address = networkConfig[contractName];
  if (!address) {
    console.warn(`Contract ${contractName} not found for chain ID ${chainId}`);
    return '';
  }

  return address;
}

// Ensure the V2 factory address is correctly retrieved for Sepolia
const sepoliaV2Address = getNetworkContractAddress(ChainId.SEPOLIA, 'factoryAddressV2');
console.log('Sepolia V2 Factory Address:', sepoliaV2Address);

export default contractAddresses; 