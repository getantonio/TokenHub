/**
 * PUBLIC VERIFICATION SCRIPT
 * This script checks the factory's public state without requiring private key access.
 * Can be used by anyone to verify the factory's configuration.
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking factory state with account:", deployer.address);

  // Contract addresses
  const factoryAddress = "0xc932F77C5F38Cf7FA5f0728D34f1dD0517C4ae97";
  const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Factory ABI - only public view functions
  const factoryAbi = [
    "function deploymentFee() external view returns (uint256)",
    "function implementation() external view returns (address)",
    "function owner() external view returns (address)",
    "function getImplementation() external view returns (address)"
  ];

  // Get the factory contract
  const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

  // Check implementation
  console.log("\nChecking Factory State:");
  console.log("----------------------");
  
  // Try different methods to get implementation
  let implementation;
  try {
    implementation = await factory.implementation();
    console.log("Implementation (via implementation()):", implementation);
  } catch (error) {
    console.log("Could not get implementation via implementation()");
  }

  try {
    implementation = await factory.getImplementation();
    console.log("Implementation (via getImplementation()):", implementation);
  } catch (error) {
    console.log("Could not get implementation via getImplementation()");
  }

  // Check owner
  try {
    const owner = await factory.owner();
    console.log("\nContract Owner:", owner);
  } catch (error) {
    console.log("Could not get owner - contract might not be initialized");
  }

  // Check deployment fee
  try {
    const fee = await factory.deploymentFee();
    console.log("\nDeployment Fee:", ethers.formatEther(fee), "BNB");
  } catch (error) {
    console.log("Could not get deployment fee - contract might not be initialized");
  }

  // Get contract code to verify it exists
  const code = await provider.getCode(factoryAddress);
  console.log("\nContract exists:", code !== "0x");
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 