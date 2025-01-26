require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const INFURA_KEY = process.env.INFURA_KEY || "";

const config = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY]
    },
    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [PRIVATE_KEY]
    },
    "op-sepolia": {
      url: "https://sepolia.optimism.io",
      accounts: [PRIVATE_KEY]
    },
    "polygon-amoy": {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

module.exports = config; 