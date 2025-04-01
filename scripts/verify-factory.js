const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  
  console.log("Verifying factory contract deployment...");
  
  try {
    // Check if contract exists
    const code = await hre.ethers.provider.getCode(factoryAddress);
    console.log("\nContract code exists:", code.length > 2);
    console.log("Code length:", code.length);
    
    // Get contract instance
    const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
    const [signer] = await hre.ethers.getSigners();
    
    // Check basic contract state
    const owner = await factory.owner();
    const implementation = await factory.implementation();
    const feeCollector = await factory.feeCollector();
    
    console.log("\nContract state:");
    console.log("Owner:", owner);
    console.log("Implementation:", implementation);
    console.log("Fee Collector:", feeCollector);
    
    // Check if implementation exists
    const implCode = await hre.ethers.provider.getCode(implementation);
    console.log("\nImplementation contract exists:", implCode.length > 2);
    console.log("Implementation code length:", implCode.length);
    
    // Try to get some pools
    const poolCount = await factory.getPoolCount();
    console.log("\nPool count:", poolCount.toString());
    
    const allPools = await factory.getAllPools();
    console.log("All pools:", allPools);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 