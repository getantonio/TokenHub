require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
const { ChainId, SUPPORTED_NETWORKS } = require('./hardhat.networks');

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// Only include networks that have a private key configured
const networks = {};

// Add networks only if private key is available and valid
if (PRIVATE_KEY && PRIVATE_KEY.length >= 64) {
  // Add Sepolia if configured
  if (process.env.SEPOLIA_RPC_URL) {
    networks.sepolia = {
      url: SUPPORTED_NETWORKS[ChainId.SEPOLIA].rpcUrl,
      accounts: [PRIVATE_KEY],
      chainId: ChainId.SEPOLIA
    };
  }
  
  // Add Optimism Sepolia if configured
  if (process.env.OPTIMISM_SEPOLIA_RPC_URL) {
    networks.opSepolia = {
      url: SUPPORTED_NETWORKS[ChainId.OPTIMISM_SEPOLIA].rpcUrl,
      accounts: [PRIVATE_KEY],
      chainId: ChainId.OPTIMISM_SEPOLIA
    };
  }
  
  // Add Arbitrum Sepolia if configured
  if (process.env.ARBITRUM_SEPOLIA_RPC_URL) {
    networks.arbitrumSepolia = {
      url: SUPPORTED_NETWORKS[ChainId.ARBITRUM_SEPOLIA].rpcUrl,
      accounts: [PRIVATE_KEY],
      chainId: ChainId.ARBITRUM_SEPOLIA
    };
  }
  
  // Add Polygon Amoy if configured
  if (process.env.POLYGON_AMOY_RPC_URL) {
    networks.polygonAmoy = {
      url: SUPPORTED_NETWORKS[ChainId.POLYGON_AMOY].rpcUrl,
      accounts: [PRIVATE_KEY],
      chainId: ChainId.POLYGON_AMOY
    };
  }
  
  // Add BSC Testnet if configured
  if (process.env.BSC_TESTNET_RPC_URL) {
    networks.bscTestnet = {
      url: SUPPORTED_NETWORKS[ChainId.BSC_TESTNET].rpcUrl,
      accounts: [PRIVATE_KEY],
      chainId: ChainId.BSC_TESTNET
    };
  }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.22",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: Object.keys(networks).length > 0 ? networks : undefined,
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || '',
      optimismSepolia: process.env.OPTIMISM_API_KEY || '',
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || ''
    }
  }
}; 