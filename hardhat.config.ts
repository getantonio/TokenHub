require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-deploy");
require("dotenv").config();
require('@openzeppelin/hardhat-upgrades');

const config = {
  paths: {
    sources: "./src/contracts",
    tests: "./src/test",
    cache: "./cache",
    artifacts: "./src/contracts/artifacts"
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: ["1f003db47c7e61909670de987bbf2cc96391599288b5fbe02f2f55185e89ecfd"],
      gasPrice: 10000000000, // 10 gwei
      gas: 2100000,         // Higher gas limit for BSC
      timeout: 180000,      // 3 minutes
      confirmations: 3,     // Wait for 3 confirmations
      networkCheckTimeout: 100000,
      timeoutBlocks: 200
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY || ""],
      gasPrice: "auto",
      gas: "auto",
      timeout: 180000,      // 3 minutes
      confirmations: 2,     // Wait for 2 confirmations
      networkCheckTimeout: 100000,
      timeoutBlocks: 200
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://polygon-amoy.infura.io/v3/",
      chainId: 80002,
      accounts: [process.env.PRIVATE_KEY || ""],
      gasPrice: "auto",
      gas: "auto",
      timeout: 180000,      // 3 minutes
      confirmations: 2,     // Wait for 2 confirmations
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
      }
    ]
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      amoy: process.env.POLYGONSCAN_API_KEY
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://testnet.polygonscan.com"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;