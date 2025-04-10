// JavaScript version of network configuration for Hardhat
const ChainId = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  POLYGON_AMOY: 80002,
  BSC_TESTNET: 97,
  BSC_MAINNET: 56
};

const DEFAULT_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000';

// Network configurations
const SUPPORTED_NETWORKS = {
  [ChainId.POLYGON_AMOY]: {
    id: ChainId.POLYGON_AMOY,
    name: 'Polygon Amoy',
    factoryAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://www.oklink.com/amoy',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'AMOY',
      symbol: 'AMOY',
    },
    blockExplorers: {
      default: {
        name: 'OKLink',
        url: 'https://www.oklink.com/amoy',
      },
    }
  },
  [ChainId.BSC_MAINNET]: {
    id: ChainId.BSC_MAINNET,
    name: 'BNB Smart Chain',
    factoryAddress: process.env.NEXT_PUBLIC_BSC_MAINNET_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://bscscan.com',
    rpcUrl: process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
    testnet: false,
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'BNB',
    },
    blockExplorers: {
      default: {
        name: 'BscScan',
        url: 'https://bscscan.com',
      },
    }
  },
  [ChainId.BSC_TESTNET]: {
    id: ChainId.BSC_TESTNET,
    name: 'BSC Testnet',
    factoryAddress: process.env.NEXT_PUBLIC_BSC_TESTNET_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://testnet.bscscan.com',
    rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'tBNB',
    },
    blockExplorers: {
      default: {
        name: 'BscScan',
        url: 'https://testnet.bscscan.com',
      },
    }
  },
  [ChainId.SEPOLIA]: {
    id: ChainId.SEPOLIA,
    name: 'Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://sepolia.etherscan.io',
      },
    }
  },
  [ChainId.ARBITRUM_SEPOLIA]: {
    id: ChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Arbiscan',
        url: 'https://sepolia.arbiscan.io',
      },
    }
  },
  [ChainId.OPTIMISM_SEPOLIA]: {
    id: ChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    factoryAddress: process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    testnet: true,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://sepolia-optimism.etherscan.io',
      },
    }
  },
  [ChainId.ETHEREUM]: {
    id: ChainId.ETHEREUM,
    name: 'Ethereum',
    factoryAddress: process.env.NEXT_PUBLIC_ETHEREUM_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS,
    explorerUrl: 'https://etherscan.io',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    testnet: false,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://etherscan.io',
      },
    }
  }
};

module.exports = {
  ChainId,
  SUPPORTED_NETWORKS
}; 