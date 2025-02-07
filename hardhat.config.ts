require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
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
    "optimism-sepolia": {
      url: process.env.NEXT_PUBLIC_OPSEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 11155420,
      verifyApiKey: process.env.OPTIMISM_API_KEY
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
  etherscan: {
    apiKey: {
      "optimism-sepolia": process.env.OPTIMISM_API_KEY || ""
    },
    customChains: [
      {
        network: "optimism-sepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;