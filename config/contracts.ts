import { ChainId } from './networks';

interface ContractAddresses {
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
    factoryAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS_V1 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_POLYGON_AMOY_TOKEN_TEMPLATE_ADDRESS_V1 || ''
  },
  [ChainId.OP_SEPOLIA]: {
    factoryAddress: process.env.NEXT_PUBLIC_OP_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_OP_SEPOLIA_TOKEN_TEMPLATE_ADDRESS_V1 || ''
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    tokenTemplateAddressV1: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_TEMPLATE_ADDRESS_V1 || ''
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