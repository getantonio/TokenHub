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
      bscTestnet: process.env.BSCSCAN_API_KEY
    }
  },
  sourcify: {
    enabled: true
  }
};

module.exports = config;