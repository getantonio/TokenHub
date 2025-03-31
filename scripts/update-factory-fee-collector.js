require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const hre = require("hardhat");

async function main() {
  console.log("Updating factory's fee collector...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get contract addresses
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  const newFeeCollectorAddress = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS;
  
  if (!factoryAddress || !newFeeCollectorAddress) {
    throw new Error("Required environment variables not set");
  }
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`New fee collector address: ${newFeeCollectorAddress}`);
  
  // Connect to factory contract
  const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
  
  // Get current fee collector
  const currentFeeCollector = await factory.feeCollector();
  console.log(`Current fee collector: ${currentFeeCollector}`);
  
  // Update fee collector
  console.log("Updating fee collector...");
  const tx = await factory.setFeeCollector(newFeeCollectorAddress);
  await tx.wait();
  
  // Verify update
  const updatedFeeCollector = await factory.feeCollector();
  console.log(`Updated fee collector: ${updatedFeeCollector}`);
  
  if (updatedFeeCollector.toLowerCase() === newFeeCollectorAddress.toLowerCase()) {
    console.log("✅ Fee collector updated successfully!");
  } else {
    console.log("❌ Fee collector update failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 