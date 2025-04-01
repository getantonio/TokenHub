require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/de082d8afc854286a7bdc56f2895fc67";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000"; // Default key, will not work

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true
        },
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      chainId: 31337
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 5000000000, // 5 gwei
      timeout: 120000, // 2 minutes
      gasMultiplier: 1.5
    },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: 30000000000, // 30 gwei
      maxPriorityFeePerGas: 30000000000, // 30 gwei
      maxFeePerGas: 50000000000, // 50 gwei
      timeout: 120000, // 2 minutes
      gasMultiplier: 1.5
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  }
}; 