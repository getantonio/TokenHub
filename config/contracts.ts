import { ChainId } from './networks';

export interface ContractAddresses {
  factoryAddress?: string;
  factoryAddressV2?: string;
  tokenTemplateAddressV1?: string;
  tokenTemplateAddressV2?: string;
}

export const contractAddresses: Record<number, ContractAddresses> = {
  [ChainId.MAINNET]: {
    factoryAddress: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS || ''
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

export function getNetworkContractAddress(
  chainId: number, 
  contractName: keyof ContractAddresses
): string {
  const networkContracts = contractAddresses[chainId];
  if (!networkContracts) {
    console.warn(`Network configuration not found for chainId: ${chainId}`);
    return '';
  }
  
  const address = networkContracts[contractName];
  if (!address) {
    console.warn(`Contract ${contractName} not found for chainId: ${chainId}`);
    return '';
  }
  
  return address;
}

// Ensure the V2 factory address is correctly retrieved for Sepolia
const sepoliaV2Address = getNetworkContractAddress(ChainId.SEPOLIA, 'factoryAddressV2');
console.log('Sepolia V2 Factory Address:', sepoliaV2Address); 