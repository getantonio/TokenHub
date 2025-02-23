import { ChainId } from '@/types/chain';

interface ContractAddresses {
  factoryAddress: string;
  factoryAddressV2: string;
  factoryAddressV3: string;
  dexListingFactory: string;
  dexListingTemplate: string;
}

export const contractAddresses: { [key: number]: ContractAddresses } = {
  11155111: { // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  421614: { // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  11155420: { // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  80002: { // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  97: { // BSC Testnet
    factoryAddress: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: '0xD9dF868977ef71e7B22256993AF730bDA613544F',
    dexListingFactory: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  56: { // BSC Mainnet
    factoryAddress: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_BSC_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_BSC_DEX_LISTING_TEMPLATE_ADDRESS || ''
  }
};

function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'mainnet';
    case 11155111:
      return 'sepolia';
    case 421614:
      return 'arbitrumsepolia';
    case 11155420:
      return 'opsepolia';
    case 80002:
      return 'polygonamoy';
    case 97:
      return 'bsctestnet';
    case 56:
      return 'bsc';
    default:
      return 'unknown';
  }
}

export function getNetworkContractAddress(chainId: number, contractType: string): string {
  const networkName = getNetworkName(chainId).toUpperCase();
  
  // Log input parameters
  console.log('Getting contract address for:', {
    chainId,
    networkName,
    contractType,
    env: process.env
  });
  
  // Special handling for BSC Testnet V3 Factory
  if (chainId === 97 && contractType === 'factoryAddressV3') {
    const address = '0xD9dF868977ef71e7B22256993AF730bDA613544F';
    console.log('Using hardcoded BSC Testnet V3 Factory address:', address);
    return address;
  }
  
  let envKey = '';
  
  // Handle special cases for environment variable keys
  if (contractType === 'dexListingFactory') {
    envKey = `NEXT_PUBLIC_${networkName}_DEX_LISTING_FACTORY_ADDRESS`;
  } else {
    // Handle factory addresses specially
    if (contractType.toLowerCase().startsWith('factory')) {
      const version = contractType.match(/v(\d+)/i)?.[1] || '1';
      envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V${version}`;
    } else {
      envKey = `NEXT_PUBLIC_${networkName}_${contractType.toUpperCase()}`;
    }
  }
  
  // Get the value from environment
  const value = process.env[envKey];
  
  // Log the environment variable details
  console.log('Environment variable details:', {
    envKey,
    value,
    exists: envKey in process.env,
    allKeys: Object.keys(process.env).filter(key => key.includes(networkName))
  });
  
  // Return the value directly for dexListingFactory
  if (contractType === 'dexListingFactory') {
    return value || '';
  }
  
  // Handle other contract types
  switch (contractType) {
    case 'factoryV1':
    case 'factoryAddress':
    case 'factoryAddressV1':
      return value || process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V1`] || '';
    case 'factoryV2':
    case 'factoryAddressV2':
    case 'FACTORY_ADDRESS_V2':
      return value || process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V2`] || '';
    case 'factoryV3':
    case 'factoryAddressV3':
    case 'FACTORY_ADDRESS_V3':
      return value || process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V3`] || '';
    case 'dexListingTemplate':
      return process.env[`NEXT_PUBLIC_${networkName}_DEX_LISTING_TEMPLATE_ADDRESS`] || '';
    case 'factoryAddressV2DirectDEX_Make':
      return process.env[`NEXT_PUBLIC_${networkName}_TOKEN_FACTORY_V2_MAKE_ADDRESS`] || '';
    case 'factoryAddressV2DirectDEX_Bake':
      return process.env[`NEXT_PUBLIC_${networkName}_TOKEN_FACTORY_V2_BAKE_ADDRESS`] || '';
    default:
      console.warn(`Unknown contract type: ${contractType}`);
      return '';
  }
}

export const FACTORY_ADDRESSES: Record<string, Record<number, string>> = {
  v1: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V1 || '',
  },
  v2: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2 || '',
  },
  v3: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
    [ChainId.BSC_TESTNET]: '0xD9dF868977ef71e7B22256993AF730bDA613544F',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
  },
  dexListing: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_FACTORY_ADDRESS || '',
  }
};

export const SPLIT_TOKEN_FACTORY_ADDRESS: { [key in ChainId]?: string } = {
  [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_SPLIT_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_SPLIT_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
  [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_SPLIT_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
  [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_SPLIT_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000'
};

export const TOKEN_FACTORY_V2_MAKE_ADDRESS = {
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_MAKE_ADDRESS || '',
  [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_FACTORY_V2_MAKE_ADDRESS || '',
  [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_FACTORY_V2_MAKE_ADDRESS || '',
  [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_FACTORY_V2_MAKE_ADDRESS || '',
  [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_TOKEN_FACTORY_V2_MAKE_ADDRESS || '',
  [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY_V2_MAKE_ADDRESS || ''
};

export const TOKEN_FACTORY_V2_BAKE_ADDRESS: { [key in ChainId]?: string } = {
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY_V2_BAKE_ADDRESS || ''
};

export default contractAddresses; 