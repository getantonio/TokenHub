const { ethers } = require("hardhat");

async function main() {
  // Get the address from environment or hardcode
  const factoryAddress = "0x07660e3b490E74a286927C7eF7219192003cFee2"; // V1 factory
  
  console.log("Trying to create token with V1 factory at:", factoryAddress);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using account:", deployerAddress);
  
  // Hard-coded transaction data for createToken with minimal parameters
  // This was generated using web3.eth.abi.encodeFunctionCall for safety
 