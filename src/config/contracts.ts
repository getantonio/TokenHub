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
    factoryAddressV3: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
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
  
  // Enhanced debugging for Sepolia
  if (chainId === 11155111) {
    console.log('Sepolia Contract Resolution:', {
      chainId,
      networkName,
      contractType,
      sepoliaV3Direct: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('SEPOLIA')),
      allFactoryKeys: Object.keys(process.env).filter(key => key.includes('FACTORY')),
    });
    
    // Early return for DirectDEX_Fixed contract on Sepolia to avoid the general lookup
    if (contractType === 'factoryAddressV2DirectDEX_Fixed') {
      const address = process.env.NEXT_PUBLIC_SEPOLIA_V2_DIRECTDEX_FIXED_ADDRESS;
      console.log(`Using Sepolia DirectDEX Fixed contract address: ${address || '0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce'}`);
      return address || '0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce';
    }
  }
  
  // Enhanced debugging for BSC Testnet
  if (chainId === 97) {
    console.log('BSC Testnet Contract Resolution:', {
      chainId,
      networkName,
      contractType,
      bscTestnetV3Direct: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('BSCTESTNET')),
      allFactoryKeys: Object.keys(process.env).filter(key => key.includes('FACTORY')),
      hardcodedValues: {
        dexListingFactory: '0x822406674Abcf53A7814422AA49756fe69383546',
        v2DirectDexFixed: '0x822406674Abcf53A7814422AA49756fe69383546'
      }
    });

    // For BSC Testnet, provide direct access to specific contract types
    if (contractType === 'dexListingFactory') {
      console.log('BSC Testnet DEX Listing Factory address override applied');
      return '0x822406674Abcf53A7814422AA49756fe69383546';
    }
    
    if (contractType === 'factoryAddressV2DirectDEX_Fixed') {
      console.log('BSC Testnet V2 DirectDEX Fixed address override applied');
      return '0xE1469497243ce0A7f5d26f81c34E9eFA5975569b';
    }
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
  
  // Enhanced logging for debugging
  console.log('Factory lookup details:', {
    envKey,
    value,
    exists: envKey in process.env,
    directBscTestnetCheck: chainId === 97 ? process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 : null
  });

  // Special handling for BSC Testnet V3
  if (chainId === 97 && contractType === 'factoryAddressV3') {
    const bscTestnetV3 = process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3;
    if (bscTestnetV3) {
      console.log('Using BSC Testnet V3 address:', bscTestnetV3);
      return bscTestnetV3;
    }
    
    // Fallback value for BSC Testnet V3
    return '0x631B224FeA79e2af00D8A891e9e21E7a9f63CfC7';
  }
  
  // Return the value directly for dexListingFactory
  if (contractType === 'dexListingFactory') {
    return value || '';
  }
  
  // Handle other contract types
  switch (contractType) {
    case 'factoryV1':
    case 'factoryAddress':
    case 'factoryAddressV1':
      return process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V1`] || '';
    case 'factoryV2':
    case 'factoryAddressV2':
    case 'FACTORY_ADDRESS_V2':
      return process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V2`] || '';
    case 'factoryV3':
    case 'factoryAddressV3':
    case 'FACTORY_ADDRESS_V3':
      // Direct check for Sepolia V3
      if (chainId === 11155111) {
        const sepoliaV3 = process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3;
        console.log('Using Sepolia V3 address:', sepoliaV3);
        // Provide fallback for Sepolia V3
        return sepoliaV3 || '0x704d0B1237373D466bc22635c076456f3afD7C11';
      }
      // Direct check for BSC Testnet V3
      if (chainId === 97) {
        return process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '0x631B224FeA79e2af00D8A891e9e21E7a9f63CfC7';
      }
      // Fallbacks for other networks
      if (chainId === 421614) { // Arbitrum Sepolia
        return process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '0x4768734d10DCdfB8131eF6b942627557bDd754Eb';
      }
      if (chainId === 11155420) { // Optimism Sepolia
        return process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '0x4768734d10DCdfB8131eF6b942627557bDd754Eb';
      }
      if (chainId === 80002) { // Polygon Amoy
        return process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '0x631B224FeA79e2af00D8A891e9e21E7a9f63CfC7';
      }
      return process.env[`NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V3`] || '';
    case 'dexListingTemplate':
      return process.env[`NEXT_PUBLIC_${networkName}_DEX_LISTING_TEMPLATE_ADDRESS`] || '';
    case 'factoryAddressV2DirectDEX_Make':
      return process.env[`NEXT_PUBLIC_${networkName}_TOKEN_FACTORY_V2_MAKE_ADDRESS`] || '';
    case 'factoryAddressV2DirectDEX_Bake':
      return process.env[`NEXT_PUBLIC_${networkName}_TOKEN_FACTORY_V2_BAKE_ADDRESS`] || '';
    case 'factoryAddressV2DirectDEX_Fixed':
      // Use environment variables first, then fall back to hardcoded values
      if (chainId === 11155111) { // Sepolia
        const address = process.env.NEXT_PUBLIC_SEPOLIA_V2_DIRECTDEX_FIXED_ADDRESS;
        console.log(`Switch case - Using Sepolia DirectDEX Fixed address: ${address || '0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce'}`);
        return address || '0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce';
      } else if (chainId === 97) { // BSC Testnet
        return process.env.NEXT_PUBLIC_BSCTESTNET_V2_DIRECTDEX_FIXED_ADDRESS || '0xE1469497243ce0A7f5d26f81c34E9eFA5975569b';
      }
      return '';
    case 'dexListingFactory':
      // For BSC Testnet, provide a GUARANTEED fallback address
      if (chainId === 97) {
        const bscTestnetDexListingFactory = '0x822406674Abcf53A7814422AA49756fe69383546';
        console.log(`Using hardcoded BSC Testnet DEX Listing Factory: ${bscTestnetDexListingFactory}`);
        return bscTestnetDexListingFactory;
      }
      return process.env[`NEXT_PUBLIC_${networkName}_DEX_LISTING_FACTORY_ADDRESS`] || '';
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
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
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