require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");

const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0,
      },
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test test junk",
      },
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

module.exports = config; 