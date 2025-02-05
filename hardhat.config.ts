require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config = {
  networks: {
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc.amoy.testnet.polygon.com",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 421614,
    },
    optimismSepolia: {
      url: process.env.OP_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
      accounts: [PRIVATE_KEY],
      chainId: 11155420,
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      optimismSepolia: process.env.OPTIMISM_API_KEY || "",
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
            runs: 1,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
          }
        }
      },
      {
        version: "0.8.19",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
          }
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;