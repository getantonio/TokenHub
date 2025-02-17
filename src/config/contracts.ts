import { ChainId } from '@/types/chain';

interface ContractAddresses {
  factoryAddress: string;
  factoryAddressV2: string;
  factoryAddressV3: string;
  factoryAddressV2DirectDEX: string;
  factoryAddressV2DirectDEX_Make: string;
  factoryAddressV2DirectDEX_Bake: string;
  factoryAddressV2DirectDEX_TwoStep: string;
  factoryAddressTest: string;
}

export const contractAddresses: { [key: number]: ContractAddresses } = {
  11155111: { // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: '0xefFD5ceC6F2F46531afB2454B840e820D58697C6',
    factoryAddressV2DirectDEX_Make: '0x704d0B1237373D466bc22635c076456f3afD7C11',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
    factoryAddressV2DirectDEX_TwoStep: '0x704d0B1237373D466bc22635c076456f3afD7C11',
    factoryAddressTest: process.env.NEXT_PUBLIC_SEPOLIA_TEST_FACTORY_ADDRESS || ''
  },
  421614: { // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    factoryAddressV2DirectDEX_Make: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX_MAKE || '',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX_BAKE || '',
    factoryAddressV2DirectDEX_TwoStep: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_FACTORY_V2_TWOSTEP_ADDRESS || '',
    factoryAddressTest: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TEST_FACTORY_ADDRESS || ''
  },
  11155420: { // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    factoryAddressV2DirectDEX_Make: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX_MAKE || '',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX_BAKE || '',
    factoryAddressV2DirectDEX_TwoStep: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_FACTORY_V2_TWOSTEP_ADDRESS || '',
    factoryAddressTest: process.env.NEXT_PUBLIC_OPSEPOLIA_TEST_FACTORY_ADDRESS || ''
  },
  80002: { // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    factoryAddressV2DirectDEX_Make: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_DIRECTDEX_MAKE || '',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_DIRECTDEX_BAKE || '',
    factoryAddressV2DirectDEX_TwoStep: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_FACTORY_V2_TWOSTEP_ADDRESS || '',
    factoryAddressTest: process.env.NEXT_PUBLIC_POLYGONAMOY_TEST_FACTORY_ADDRESS || ''
  },
  97: { // BSC Testnet
    factoryAddress: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: '0xE1c68Cb8a037aC4E92eE2a7a30fEFA989c15Bc45',
    factoryAddressV2DirectDEX_Make: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2_DIRECTDEX_MAKE || '',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2_DIRECTDEX_BAKE || '',
    factoryAddressV2DirectDEX_TwoStep: process.env.NEXT_PUBLIC_BSCTESTNET_TOKEN_FACTORY_V2_TWOSTEP_ADDRESS || '',
    factoryAddressTest: process.env.NEXT_PUBLIC_BSCTESTNET_TEST_FACTORY_ADDRESS || ''
  },
  56: { // BSC Mainnet
    factoryAddress: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2 || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
    factoryAddressV2DirectDEX: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    factoryAddressV2DirectDEX_Make: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_DIRECTDEX_MAKE || '',
    factoryAddressV2DirectDEX_Bake: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_DIRECTDEX_BAKE || '',
    factoryAddressV2DirectDEX_TwoStep: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY_V2_TWOSTEP_ADDRESS || '',
    factoryAddressTest: process.env.NEXT_PUBLIC_BSC_TEST_FACTORY_ADDRESS || ''
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
  v2DirectDEX: {
    [ChainId.SEPOLIA]: '0xefFD5ceC6F2F46531afB2454B840e820D58697C6',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_DIRECTDEX || '',
    [ChainId.BSC_TESTNET]: '0xE1c68Cb8a037aC4E92eE2a7a30fEFA989c15Bc45',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_DIRECTDEX || '',
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

export const TOKEN_FACTORY_V2_BAKE_ADDRESS = {
  [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_TOKEN_FACTORY_V2_BAKE_ADDRESS || '',
  [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY_V2_BAKE_ADDRESS || ''
};

export default contractAddresses; 