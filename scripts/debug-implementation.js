const hre = require("hardhat");

async function main() {
  const implementationAddress = "0x85d80387605957A51442E8F25C8A34567A36DdEF";
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  
  console.log("Checking implementation contract state...");
  
  // Get the implementation contract
  const implementation = await hre.ethers.getContractAt("LendingPool", implementationAddress);
  
  try {
    // Check if contract exists
    const code = await hre.ethers.provider.getCode(implementationAddress);
    console.log("Contract exists at address:", implementationAddress);
    console.log("Contract code length:", code.length);
    
    // Try to get implementation owner
    try {
      const owner = await implementation.owner();
      console.log("Implementation owner:", owner);
    } catch (e) {
      console.log("Could not get implementation owner:", e.message);
    }
    
    // Try to get factory reference
    try {
      const factory = await implementation.factory();
      console.log("Implementation factory:", factory);
      console.log("Expected factory:", factoryAddress);
      console.log("Factory matches:", factory.toLowerCase() === factoryAddress.toLowerCase());
    } catch (e) {
      console.log("Could not get implementation factory:", e.message);
    }
    
    // Check if contract is initialized
    try {
      const initialized = await implementation.initialized();
      console.log("Contract initialized:", initialized);
    } catch (e) {
      console.log("Could not check initialization:", e.message);
    }
    
  } catch (e) {
    console.log("Error checking contract:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 