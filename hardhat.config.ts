require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-deploy");
require("dotenv").config();

const config = {
  paths: {
    sources: "./src/contracts",
    tests: "./src/test",
    cache: "./src/contracts/cache",
    artifacts: "./src/contracts/artifacts"
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    "sepolia": {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 11155111,
      verifyApiKey: process.env.ETHERSCAN_API_KEY
    },
    "optimism-sepolia": {
      url: process.env.NEXT_PUBLIC_OPSEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 11155420,
      verifyApiKey: process.env.OPTIMISM_API_KEY
    },
    "arbitrumsepolia": {
      url: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 421614,
      verifyApiKey: process.env.ARBITRUM_API_KEY,
      gasPrice: 100000000,  // 0.1 gwei
      gas: 1000000,  // 1M gas limit
      maxPriorityFeePerGas: 100000000,  // 0.1 gwei
      maxFeePerGas: 200000000,  // 0.2 gwei
      timeout: 180000,  // 3 minutes
      confirmations: 1,
      networkCheckTimeout: 100000,
      timeoutBlocks: 200
    },
    "polygon-amoy": {
      url: process.env.POLYGON_AMOY_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 80002,
      verifyApiKey: process.env.POLYGONSCAN_API_KEY,
      gasPrice: 35000000000,  // 35 gwei (higher than pending tx)
      gas: 1500000,  // 1.5M gas limit
      timeout: 180000,  // 3 minutes
      confirmations: 2,
      networkCheckTimeout: 100000,
      timeoutBlocks: 200
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 gwei
      gas: 2100000,         // Higher gas limit for BSC
      timeout: 180000,      // 3 minutes
      confirmations: 3,     // Wait for 3 confirmations
      networkCheckTimeout: 100000,
      timeoutBlocks: 200,
      verifyApiKey: "Z8FQT28BE7RR34GR5D8RMX6YGQ6AS6JSR2"
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 3000000000,  // 3 gwei
      gas: 2100000,         // Higher gas limit for BSC
      timeout: 180000,      // 3 minutes
      confirmations: 3,     // Wait for 3 confirmations
      networkCheckTimeout: 100000,
      timeoutBlocks: 200,
      verifyApiKey: process.env.BSCSCAN_API_KEY
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22",
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
        version: "0.8.19",
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
  etherscan: {
    apiKey: {
      "sepolia": process.env.ETHERSCAN_API_KEY || "",
      "optimism-sepolia": process.env.OPTIMISM_API_KEY || "",
      "arbitrumsepolia": process.env.ARBISCAN_API_KEY || "",
      "polygon-amoy": process.env.POLYGONSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "optimism-sepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io"
        }
      },
      {
        network: "arbitrumsepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "polygon-amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://www.oklink.com/amoy"
        }
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;