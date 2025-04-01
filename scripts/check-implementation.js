const { ethers } = require('hardhat');

async function main() {
  console.log("Checking implementation address...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Get the factory contract
  const factoryAddress = "0x9bAF646fb9fe4c95B51BB78Bb55d06F158b1b779";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  try {
    const implementationAddress = await factory.implementation();
    console.log("\nImplementation address:", implementationAddress);
    
    // Try to get the implementation contract
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const implementation = LendingPool.attach(implementationAddress);
    
    // Try to get the initialized status
    try {
      const isInitialized = await implementation.initialized();
      console.log("Is initialized:", isInitialized);
    } catch (error) {
      console.log("Error checking initialization status:", error.message);
    }
  } catch (error) {
    console.log("Error checking implementation:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 