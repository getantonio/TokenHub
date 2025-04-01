const hre = require("hardhat");

async function main() {
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  const implementationAddress = "0x85d80387605957A51442E8F25C8A34567A36DdEF";
  const feeCollectorAddress = "0x9519C9b492BcD126593B4216e0da052C0b25A216";
  
  console.log("Checking factory initialization state...");
  
  // Get the factory contract
  const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
  const [signer] = await hre.ethers.getSigners();
  
  try {
    // Check if contract exists
    const code = await hre.ethers.provider.getCode(factoryAddress);
    console.log("Contract exists at address:", factoryAddress);
    console.log("Contract code length:", code.length);
    
    // Check if signer is owner
    const owner = await factory.owner();
    console.log("Factory owner:", owner);
    console.log("Signer address:", signer.address);
    console.log("Is signer owner:", owner.toLowerCase() === signer.address.toLowerCase());
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("Signer is not the owner. Cannot initialize.");
      return;
    }
    
    // Try to get implementation address
    try {
      const implementation = await factory.implementation();
      console.log("Current implementation:", implementation);
      console.log("Expected implementation:", implementationAddress);
      console.log("Implementation matches:", implementation.toLowerCase() === implementationAddress.toLowerCase());
      
      if (implementation.toLowerCase() !== implementationAddress.toLowerCase()) {
        console.log("Implementation address mismatch. Attempting to update...");
        const tx = await factory.setImplementation(implementationAddress);
        await tx.wait();
        console.log("Implementation updated successfully");
      }
    } catch (e) {
      console.log("Could not get implementation:", e.message);
      console.log("Attempting to set implementation...");
      const tx = await factory.setImplementation(implementationAddress);
      await tx.wait();
      console.log("Implementation set successfully");
    }
    
    // Try to get fee collector
    try {
      const feeCollector = await factory.feeCollector();
      console.log("Current fee collector:", feeCollector);
      console.log("Expected fee collector:", feeCollectorAddress);
      console.log("Fee collector matches:", feeCollector.toLowerCase() === feeCollectorAddress.toLowerCase());
      
      if (feeCollector.toLowerCase() !== feeCollectorAddress.toLowerCase()) {
        console.log("Fee collector address mismatch. Attempting to update...");
        const tx = await factory.setFeeCollector(feeCollectorAddress);
        await tx.wait();
        console.log("Fee collector updated successfully");
      }
    } catch (e) {
      console.log("Could not get fee collector:", e.message);
      console.log("Attempting to set fee collector...");
      const tx = await factory.setFeeCollector(feeCollectorAddress);
      await tx.wait();
      console.log("Fee collector set successfully");
    }
    
    // Final state check
    console.log("\nFinal state check:");
    const finalImplementation = await factory.implementation();
    const finalFeeCollector = await factory.feeCollector();
    console.log("Implementation:", finalImplementation);
    console.log("Fee collector:", finalFeeCollector);
    
  } catch (e) {
    console.log("Error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 