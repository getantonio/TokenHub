// Simple debug script for pool creation
const { ethers } = require('hardhat');

async function main() {
  console.log("Simple debugging for pool creation...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  
  console.log(`Factory address: ${factoryAddress}`);
  
  // Create factory contract instance with full ABI
  const factoryABI = require('../artifacts/contracts/defi/LoanPoolFactory.sol/LoanPoolFactory.json').abi;
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Examine the factory contract
  console.log("\nFactory contract examination:");
  const implementation = await factory.implementation();
  console.log(`Implementation: ${implementation}`);
  
  // Create a new lending pool directly
  try {
    console.log("\nCreating LendingPool contract directly...");
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const directImplementation = await LendingPool.deploy();
    await directImplementation.waitForDeployment();
    console.log(`Direct implementation deployed to: ${await directImplementation.getAddress()}`);
    
    // Update the factory to use the new implementation
    console.log("\nUpdating factory with new implementation...");
    
    // Check if the factory has a method to update the implementation
    try {
      const methods = Object.keys(factory.interface.functions);
      console.log("Available methods on factory:", methods);
    } catch (e) {
      console.error("Error getting factory methods:", e.message);
    }
  } catch (error) {
    console.error("Error creating direct implementation:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 