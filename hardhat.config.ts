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
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 11155111,
      verifyApiKey: process.env.ETHERSCAN_API_KEY
    },
    "optimism-sepolia": {
      url: process.env.NEXT_PUBLIC_OPSEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 11155420,
      verifyApiKey: process.env.OPTIMISM_API_KEY
    },
    "arbitrumsepolia": {
      url: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 421614,
      verifyApiKey: process.env.ARBITRUM_API_KEY
    },
    "polygon-amoy": {
      url: process.env.POLYGON_AMOY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 80002,
      verifyApiKey: process.env.POLYGONSCAN_API_KEY,
      gasPrice: 35000000000,  // 35 gwei (higher than pending tx)
      gas: 1500000,  // 1.5M gas limit
      timeout: 180000,  // 3 minutes
      confirmations: 2,
      networkCheckTimeout: 100000,
      timeoutBlocks: 200
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
      "arbitrumsepolia": process.env.ARBITRUM_API_KEY || "",
      "polygon-amoy": process.env.POLYGONSCAN_API_KEY
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
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;