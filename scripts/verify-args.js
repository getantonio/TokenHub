const { ethers } = require("hardhat");

// Get the factory implementation interface
const TokenFactory = require("../artifacts/contracts/TokenFactory_v2.1.0.sol/TokenFactory_v2_1_0.json");
const factoryInterface = new ethers.Interface(TokenFactory.abi);

// Encode the initialization data
const initData = factoryInterface.encodeFunctionData("initialize");

module.exports = [
  "0x9df49990d25dF8c5c2948DAf7d1Ff95700f970d9", // implementation address
  initData // initialization data
]; 