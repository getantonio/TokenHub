import { ChainId } from '@/types/chain';

interface ContractAddresses {
  factoryAddress: string;
  factoryAddressV2: string;
  factoryAddressV3: string;
  factoryAddressV4: string;
  dexListingFactory: string;
  dexListingTemplate: string;
}

export const contractAddresses: { [key: number]: ContractAddresses } = {
  11155111: { // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  421614: { // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V4 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  11155420: { // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  80002: { // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',// Hardcoded for reliability
    factoryAddressV4: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4 || '',// Hardcoded for reliability
    dexListingFactory: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  97: { // BSC Testnet
    factoryAddress: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  56: { // BSC Mainnet
    factoryAddress: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4 || '',
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
  
  console.log('Contract Resolution:', {
    chainId,
    networkName,
    contractType,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('FACTORY'))
  });

  // First check contractAddresses map
  if (contractAddresses[chainId]) {
    switch (contractType.toUpperCase()) {
      case 'FACTORYADDRESSV3':
      case 'FACTORY_ADDRESS_V3':
        const addressFromMap = contractAddresses[chainId].factoryAddressV3;
        if (addressFromMap) {
          console.log(`Using ${networkName} V3 address from map:`, addressFromMap);
          return addressFromMap;
        }
        break;
    }
  }

  // If not found in map, try environment variables
  const envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V3`;
  const envAddress = process.env[envKey];
  if (envAddress) {
    console.log(`Using ${networkName} V3 address from env:`, envAddress);
    return envAddress;
  }

  console.warn(`No address found for ${networkName} V3`);
  return '';
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
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
  },
  v4: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4 || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V4 || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4 || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4 || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4 || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4 || '',
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

// Add a new record for the v2 DirectDEX Fixed factory
export const FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED: Record<number, string> = {
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_V2_DIRECTDEX_FIXED_ADDRESS || '0xF78Facc20c24735066B2c962B6Fa58d4234Ed8F3',
  [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_V2_DIRECTDEX_FIXED_ADDRESS || '0xE1469497243ce0A7f5d26f81c34E9eFA5975569b',
};

export const TOKEN_FACTORY_V2_DIRECTDEX_FIXED_ADDRESS = {
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_V2_DIRECTDEX_FIXED_ADDRESS || '0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce',
  [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_V2_DIRECTDEX_FIXED_ADDRESS || '0xE1469497243ce0A7f5d26f81c34E9eFA5975569b'
};

export default contractAddresses; 