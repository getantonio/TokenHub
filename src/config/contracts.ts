import { ChainId } from '@/types/chain';
import { BrowserProvider } from 'ethers';
import { NETWORK_CONFIG, NetworkId, NetworkName, SUPPORTED_NETWORKS } from './networks';

// Lending Pool System Contracts
export const LENDING_CONTRACTS = {
  PRICE_ORACLE: "priceOracle",
  INTEREST_RATE_MODEL: "interestRateModel",
  FEE_COLLECTOR: "feeCollector",
  LENDING_POOL_IMPL: "lendingPoolImpl",
  LOAN_POOL_FACTORY: "loanPoolFactory",
} as const;

export type LendingContractName = keyof typeof LENDING_CONTRACTS;

export const getLendingContractAddress = (contractName: LendingContractName, network: NetworkName): string => {
  const networkConfig = SUPPORTED_NETWORKS[network];
  if (!networkConfig) throw new Error(`Network ${network} not supported`);
  
  const contracts = networkConfig.contracts;
  if (!contracts) throw new Error(`No contracts configured for network ${network}`);
  
  const contractAddress = contracts[contractName];
  if (!contractAddress || typeof contractAddress !== 'string') {
    throw new Error(`Contract ${contractName} not found or invalid on network ${network}`);
  }
  
  return contractAddress;
};

// Legacy Contract Registry (for backward compatibility)
export interface ContractAddresses {
  [key: string]: string;
}

export class LegacyContractRegistry {
  private static instance: LegacyContractRegistry;
  private contractAddresses: { [networkId: number]: ContractAddresses };

  private constructor() {
    this.contractAddresses = {};
  }

  public static getInstance(): LegacyContractRegistry {
    if (!LegacyContractRegistry.instance) {
      LegacyContractRegistry.instance = new LegacyContractRegistry();
    }
    return LegacyContractRegistry.instance;
  }

  public getContractAddress(contractName: string, networkId: number): string {
    if (!this.contractAddresses[networkId]) {
      throw new Error(`No contracts registered for network ${networkId}`);
    }
    const address = this.contractAddresses[networkId][contractName];
    if (!address) {
      throw new Error(`Contract ${contractName} not found for network ${networkId}`);
    }
    return address;
  }

  public registerContract(contractName: string, address: string, networkId: number): void {
    if (!this.contractAddresses[networkId]) {
      this.contractAddresses[networkId] = {};
    }
    this.contractAddresses[networkId][contractName] = address;
  }
}

export const legacyContractRegistry = LegacyContractRegistry.getInstance();

export const contractAddresses: { [key: number]: ContractAddresses } = {
  11155111: { // Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV2WithLiquidity: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2_WITH_LIQUIDITY || '',
    factoryAddressV2WithLiquidityFixed: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3_ENHANCED || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4 || '',
    factoryAddressV4WithLiquidity: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    factoryAddressV4WithLiquidityFixed: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV4WithLiquidityFixedV2: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2 || '',
    factoryAddressV4WithLiquidityFixedV3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3 || '',
    factoryAddressV4WithLiquidityFixedV4: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4 || '',
    factoryAddressV4WithLiquidityFixedV5: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5 || '',
    factoryAddressV4WithLiquidityFixedV6: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6 || '',
    factoryAddressV4WithLiquidityFixedV7: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_SEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  421614: { // Arbitrum Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_V1_ARBITRUM_SEPOLIA || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_V2_ARBITRUM_SEPOLIA || '',
    factoryAddressV2WithLiquidity: '',
    factoryAddressV2WithLiquidityFixed: '',
    factoryAddressV3: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: '',
    factoryAddressV4: '',
    factoryAddressV4WithLiquidity: '',
    factoryAddressV4WithLiquidityFixed: '',
    factoryAddressV4WithLiquidityFixedV2: '',
    factoryAddressV4WithLiquidityFixedV3: '',
    factoryAddressV4WithLiquidityFixedV4: '',
    factoryAddressV4WithLiquidityFixedV5: '',
    factoryAddressV4WithLiquidityFixedV6: '',
    factoryAddressV4WithLiquidityFixedV7: '',
    dexListingFactory: '',
    dexListingTemplate: ''
  },
  11155420: { // Optimism Sepolia
    factoryAddress: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    factoryAddressV2WithLiquidity: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_WITH_LIQUIDITY || '',
    factoryAddressV2WithLiquidityFixed: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3_ENHANCED || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4 || '',
    factoryAddressV4WithLiquidity: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    factoryAddressV4WithLiquidityFixed: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV4WithLiquidityFixedV2: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2 || '',
    factoryAddressV4WithLiquidityFixedV3: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3 || '',
    factoryAddressV4WithLiquidityFixedV4: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4 || '',
    factoryAddressV4WithLiquidityFixedV5: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5 || '',
    factoryAddressV4WithLiquidityFixedV6: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6 || '',
    factoryAddressV4WithLiquidityFixedV7: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_OPSEPOLIA_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  80002: { // Polygon Amoy
    factoryAddress: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
    factoryAddressV2WithLiquidity: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_WITH_LIQUIDITY || '',
    factoryAddressV2WithLiquidityFixed: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3_ENHANCED || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
    factoryAddressV4WithLiquidity: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    factoryAddressV4WithLiquidityFixed: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV4WithLiquidityFixedV2: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2 || '',
    factoryAddressV4WithLiquidityFixedV3: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3 || '',
    factoryAddressV4WithLiquidityFixedV4: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4 || '',
    factoryAddressV4WithLiquidityFixedV5: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5 || '',
    factoryAddressV4WithLiquidityFixedV6: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6 || '',
    factoryAddressV4WithLiquidityFixedV7: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_POLYGONAMOY_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  97: { // BSC Testnet
    factoryAddress: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    factoryAddressV2WithLiquidity: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2_WITH_LIQUIDITY || '',
    factoryAddressV2WithLiquidityFixed: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3_ENHANCED || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4 || '',
    factoryAddressV4WithLiquidity: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    factoryAddressV4WithLiquidityFixed: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV4WithLiquidityFixedV2: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2 || '',
    factoryAddressV4WithLiquidityFixedV3: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3 || '',
    factoryAddressV4WithLiquidityFixedV4: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4 || '',
    factoryAddressV4WithLiquidityFixedV5: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5 || '',
    factoryAddressV4WithLiquidityFixedV6: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6 || '',
    factoryAddressV4WithLiquidityFixedV7: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
    dexListingFactory: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_FACTORY_ADDRESS || '',
    dexListingTemplate: process.env.NEXT_PUBLIC_BSCTESTNET_DEX_LISTING_TEMPLATE_ADDRESS || ''
  },
  56: { // BSC Mainnet
    factoryAddress: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V1 || '',
    factoryAddressV2: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2 || '',
    factoryAddressV2WithLiquidity: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_WITH_LIQUIDITY || '',
    factoryAddressV2WithLiquidityFixed: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V2_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV3: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3 || '',
    factoryAddressV3Enhanced: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V3_ENHANCED || '',
    factoryAddressV4: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4 || '',
    factoryAddressV4WithLiquidity: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    factoryAddressV4WithLiquidityFixed: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    factoryAddressV4WithLiquidityFixedV2: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2 || '',
    factoryAddressV4WithLiquidityFixedV3: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3 || '',
    factoryAddressV4WithLiquidityFixedV4: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4 || '',
    factoryAddressV4WithLiquidityFixedV5: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5 || '',
    factoryAddressV4WithLiquidityFixedV6: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6 || '',
    factoryAddressV4WithLiquidityFixedV7: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7 || '',
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
      case 'FACTORYADDRESSV2':
      case 'FACTORY_ADDRESS_V2':
        const addressFromMapV2 = contractAddresses[chainId].factoryAddressV2;
        if (addressFromMapV2) {
          console.log(`Using ${networkName} V2 address from map:`, addressFromMapV2);
          return addressFromMapV2;
        }
        break;
      case 'FACTORYADDRESSV3':
      case 'FACTORY_ADDRESS_V3':
        const addressFromMapV3 = contractAddresses[chainId].factoryAddressV3;
        if (addressFromMapV3) {
          console.log(`Using ${networkName} V3 address from map:`, addressFromMapV3);
          return addressFromMapV3;
        }
        break;
      case 'FACTORYADDRESSV4':
      case 'FACTORY_ADDRESS_V4':
        const addressFromMapV4 = contractAddresses[chainId].factoryAddressV4;
        if (addressFromMapV4) {
          console.log(`Using ${networkName} V4 address from map:`, addressFromMapV4);
          return addressFromMapV4;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITY':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY':
        const addressFromMapV4WithLiquidity = contractAddresses[chainId].factoryAddressV4WithLiquidity;
        if (addressFromMapV4WithLiquidity) {
          console.log(`Using ${networkName} V4 with liquidity address from map:`, addressFromMapV4WithLiquidity);
          return addressFromMapV4WithLiquidity;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXED':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED':
        const addressFromMapV4WithLiquidityFixed = contractAddresses[chainId].factoryAddressV4WithLiquidityFixed;
        if (addressFromMapV4WithLiquidityFixed) {
          console.log(`Using ${networkName} V4 with fixed liquidity address from map:`, addressFromMapV4WithLiquidityFixed);
          return addressFromMapV4WithLiquidityFixed;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXEDV2':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2':
        const addressFromMapV4WithLiquidityFixedV2 = contractAddresses[chainId].factoryAddressV4WithLiquidityFixedV2;
        if (addressFromMapV4WithLiquidityFixedV2) {
          console.log(`Using ${networkName} V4 with liquidity fixed V2 address from map:`, addressFromMapV4WithLiquidityFixedV2);
          return addressFromMapV4WithLiquidityFixedV2;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXEDV3':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3':
        const addressFromMapV4WithLiquidityFixedV3 = contractAddresses[chainId].factoryAddressV4WithLiquidityFixedV3;
        if (addressFromMapV4WithLiquidityFixedV3) {
          console.log(`Using ${networkName} V4 with liquidity fixed V3 (auto-distribution) address from map:`, addressFromMapV4WithLiquidityFixedV3);
          return addressFromMapV4WithLiquidityFixedV3;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXEDV4':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4':
        const addressFromMapV4WithLiquidityFixedV4 = contractAddresses[chainId].factoryAddressV4WithLiquidityFixedV4;
        if (addressFromMapV4WithLiquidityFixedV4) {
          console.log(`Using ${networkName} V4 with liquidity fixed V4 (custom distribution) address from map:`, addressFromMapV4WithLiquidityFixedV4);
          return addressFromMapV4WithLiquidityFixedV4;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXEDV5':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5':
        const addressFromMapV4WithLiquidityFixedV5 = contractAddresses[chainId].factoryAddressV4WithLiquidityFixedV5;
        if (addressFromMapV4WithLiquidityFixedV5) {
          console.log(`Using ${networkName} V4 with liquidity fixed V5 (custom distribution) address from map:`, addressFromMapV4WithLiquidityFixedV5);
          return addressFromMapV4WithLiquidityFixedV5;
        }
        break;
      case 'FACTORYADDRESSV4WITHLIQUIDITYFIXEDV6':
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6':
        const addressFromMapV4WithLiquidityFixedV6 = contractAddresses[chainId].factoryAddressV4WithLiquidityFixedV6;
        if (addressFromMapV4WithLiquidityFixedV6) {
          console.log(`Using ${networkName} V4 with liquidity fixed V6 (custom distribution) address from map:`, addressFromMapV4WithLiquidityFixedV6);
          return addressFromMapV4WithLiquidityFixedV6;
        }
        break;
      case 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7':
        // V7 factories would need to be added to the map if used consistently
        // For now rely on env variables
        break;
    }
  }

  // If not found in map, try environment variables
  let envKey;
  if (contractType.toUpperCase() === 'FACTORYADDRESSV2' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V2') {
    // Try both formats for V2 factory address
    envKey = `NEXT_PUBLIC_FACTORY_ADDRESS_V2_${networkName}`;
    const envAddress = process.env[envKey];
    if (envAddress) {
      console.log(`Using ${networkName} V2 address from env:`, envAddress);
      return envAddress;
    }
    // Try alternative format
    envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V2`;
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV3' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V3') {
    envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V3`;
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV4' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V4') {
    envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V4`;
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV4WITHLIQUIDITY' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY') {
    envKey = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V4_WITH_LIQUIDITY`;
  } else {
    envKey = `NEXT_PUBLIC_${networkName}_${contractType.toUpperCase()}`;
  }

  const envAddress = process.env[envKey];
  if (envAddress) {
    console.log(`Using ${networkName} ${contractType} address from env:`, envAddress);
    return envAddress;
  }

  if (contractType.toUpperCase() === 'FACTORYADDRESSV2' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V2') {
    console.warn(`No address found for ${networkName} V2`);
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV3' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V3') {
    console.warn(`No address found for ${networkName} V3`);
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV4' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V4') {
    console.warn(`No address found for ${networkName} V4`);
  } else if (contractType.toUpperCase() === 'FACTORYADDRESSV4WITHLIQUIDITY' || contractType.toUpperCase() === 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY') {
    console.warn(`No address found for ${networkName} V4 with liquidity`);
  }

  if (contractType === 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6') {
    // Try env var first
    const envVar = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6`;
    if (process.env[envVar]) {
      console.log(`Using ${networkName} ${contractType} from env var:`, process.env[envVar]);
      return process.env[envVar] as string;
    }
  }

  if (contractType === 'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7') {
    // Try env var first for V7
    const envVar = `NEXT_PUBLIC_${networkName}_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7`;
    if (process.env[envVar]) {
      console.log(`Using ${networkName} ${contractType} from env var:`, process.env[envVar]);
      return process.env[envVar] as string;
    }
  }

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
  v4WithLiquidity: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY || '',
  },
  v4WithLiquidityFixed: {
    [ChainId.SEPOLIA]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    [ChainId.ARBITRUM_SEPOLIA]: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    [ChainId.OPTIMISM_SEPOLIA]: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    [ChainId.POLYGON_AMOY]: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    [ChainId.BSC_TESTNET]: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
    [ChainId.BSC_MAINNET]: process.env.NEXT_PUBLIC_BSC_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED || '',
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

export class ContractRegistry {
  private static instance: ContractRegistry;
  private provider: BrowserProvider | null = null;

  private constructor() {}

  static getInstance(): ContractRegistry {
    if (!ContractRegistry.instance) {
      ContractRegistry.instance = new ContractRegistry();
    }
    return ContractRegistry.instance;
  }

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
  }

  private getNetworkConfig(chainId: NetworkId) {
    const config = NETWORK_CONFIG[chainId];
    if (!config) {
      throw new Error(`No configuration found for chain ID ${chainId}`);
    }

    // Validate required environment variables
    if (!config.QUICKSWAP_ROUTER) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_QUICKSWAP_ROUTER`);
    }
    if (!config.QUICKSWAP_FACTORY) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_DEX_FACTORY`);
    }
    if (!config.QUICKSWAP_WETH) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_WETH`);
    }

    return config;
  }

  async resolveAddress(address: string, chainId: NetworkId): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const config = this.getNetworkConfig(chainId);
    
    // If ENS is not supported on this network, return the address as is
    if (!config.SUPPORTS_ENS) {
      return address;
    }

    try {
      const resolvedAddress = await this.provider.resolveName(address);
      return resolvedAddress || address;
    } catch (error) {
      // If ENS resolution fails, return the original address
      return address;
    }
  }

  getRouterAddress(chainId: NetworkId): string {
    const config = this.getNetworkConfig(chainId);
    if (!config.QUICKSWAP_ROUTER) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_QUICKSWAP_ROUTER`);
    }
    return config.QUICKSWAP_ROUTER;
  }

  getFactoryAddress(chainId: NetworkId): string {
    const config = this.getNetworkConfig(chainId);
    if (!config.QUICKSWAP_FACTORY) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_DEX_FACTORY`);
    }
    return config.QUICKSWAP_FACTORY;
  }

  getWETHAddress(chainId: NetworkId): string {
    const config = this.getNetworkConfig(chainId);
    if (!config.QUICKSWAP_WETH) {
      throw new Error(`Missing required environment variable: NEXT_PUBLIC_POLYGONAMOY_WETH`);
    }
    return config.QUICKSWAP_WETH;
  }
}

export const contractRegistry = ContractRegistry.getInstance();

export const CONTRACTS = {
  PRICE_ORACLE: "priceOracle",
  INTEREST_RATE_MODEL: "interestRateModel",
  FEE_COLLECTOR: "feeCollector",
  LENDING_POOL_IMPL: "lendingPoolImpl",
  LOAN_POOL_FACTORY: "loanPoolFactory",
} as const;

export type ContractName = keyof typeof CONTRACTS;
export type SupportedNetwork = keyof typeof SUPPORTED_NETWORKS;

export const getContractAddress = (contractName: string, network: SupportedNetwork): string => {
  const networkConfig = SUPPORTED_NETWORKS[network];
  if (!networkConfig) throw new Error(`Network ${network} not supported`);
  
  const contracts = networkConfig.contracts;
  if (!contracts) throw new Error(`No contracts configured for network ${network}`);
  
  const contractAddress = contracts[contractName as keyof typeof contracts];
  if (!contractAddress) throw new Error(`Contract ${contractName} not found on network ${network}`);
  
  return contractAddress;
}; 