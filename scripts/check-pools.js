require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const hre = require("hardhat");

async function main() {
  console.log("Checking existing pools...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Define both factory addresses
  const oldFactoryAddress = '0xd61a8De6392750AD9FD250a59Cfa4d55f01CE9a2';
  const newFactoryAddress = '0x676C3A877b43D2D5D16f84387798D996da06e835';
  
  // Check both factory addresses
  await checkFactory(oldFactoryAddress, "OLD");
  await checkFactory(newFactoryAddress, "NEW");
}

async function checkFactory(factoryAddress, label) {
  console.log(`\n========== ${label} FACTORY ==========`);
  console.log(`Factory address: ${factoryAddress}`);
  
  // Connect to factory contract
  const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
  
  // Get all pools
  try {
    const poolCount = await factory.getPoolCount();
    console.log(`Total pools: ${poolCount}`);
    
    if (poolCount > 0) {
      console.log("Existing pools:");
      const allPools = await factory.getAllPools();
      console.log(allPools);
      
      // Check for specific assets
      const assetAddresses = [
        '0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056', // DEFLIQ token from logs
      ];
      
      for (const assetAddress of assetAddresses) {
        console.log(`\nChecking if pool exists for asset: ${assetAddress}`);
        const pool = await factory.assetToPools(assetAddress);
        console.log(`Pool address for this asset: ${pool}`);
        console.log(`Pool exists: ${pool !== '0x0000000000000000000000000000000000000000'}`);
      }
    } else {
      console.log("No pools deployed yet.");
    }
  } catch (error) {
    console.error(`Error checking ${label} factory pools:`, error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 