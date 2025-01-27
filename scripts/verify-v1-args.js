const { ethers } = require("hardhat");

// Convert factory fee to wei
const factoryFee = ethers.parseEther("0.0001");

module.exports = [
  factoryFee // factory fee in wei
]; 