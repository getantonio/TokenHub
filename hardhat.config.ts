require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ...(process.env.PRIVATE_KEY ? {
      sepolia: {
        url: process.env.SEPOLIA_RPC_URL,
        accounts: [PRIVATE_KEY],
        verify: {
          etherscan: {
            apiKey: ETHERSCAN_API_KEY
          }
        }
      }
    } : {}),
    hardhat: {
      chainId: 1337
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

module.exports = config; 