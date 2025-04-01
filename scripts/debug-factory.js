const hre = require("hardhat");

async function main() {
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  const implementationAddress = "0x85d80387605957A51442E8F25C8A34567A36DdEF";
  
  console.log("Checking factory contract state...");
  
  // Get the factory contract
  const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
  
  try {
    // Check if contract exists
    const code = await hre.ethers.provider.getCode(factoryAddress);
    console.log("Contract exists at address:", factoryAddress);
    console.log("Contract code length:", code.length);
    
    // Try to get factory owner
    try {
      const owner = await factory.owner();
      console.log("Factory owner:", owner);
    } catch (e) {
      console.log("Could not get factory owner:", e.message);
    }
    
    // Try to get implementation address
    try {
      const implementation = await factory.implementation();
      console.log("Factory implementation:", implementation);
      console.log("Expected implementation:", implementationAddress);
      console.log("Implementation matches:", implementation.toLowerCase() === implementationAddress.toLowerCase());
    } catch (e) {
      console.log("Could not get factory implementation:", e.message);
    }
    
    // Try to get fee collector
    try {
      const feeCollector = await factory.feeCollector();
      console.log("Factory fee collector:", feeCollector);
      console.log("Expected fee collector:", "0x9519C9b492BcD126593B4216e0da052C0b25A216");
      console.log("Fee collector matches:", feeCollector.toLowerCase() === "0x9519C9b492BcD126593B4216e0da052C0b25A216".toLowerCase());
    } catch (e) {
      console.log("Could not get fee collector:", e.message);
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