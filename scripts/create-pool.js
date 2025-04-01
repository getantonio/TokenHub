// Create a lending pool using the new factory
const { ethers } = require('hardhat');

async function main() {
  console.log("Creating a lending pool with the new factory...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  
  console.log(`Factory address: ${factoryAddress}`);
  
  // Create factory contract instance
  const factoryABI = [
    "function createLendingPool(address, string, string, uint256, uint256) external payable returns (address)",
    "function feeCollector() external view returns (address)",
    "function assetToPools(address) external view returns (address)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Get fee collector to check fee
  const feeCollectorABI = ["function getPoolCreationFee() external view returns (uint256)"];
  const feeCollectorAddress = await factory.feeCollector();
  const feeCollector = new ethers.Contract(feeCollectorAddress, feeCollectorABI, deployer);
  
  // Get creation fee
  const fee = await feeCollector.getPoolCreationFee();
  console.log(`Pool creation fee: ${ethers.formatEther(fee)} ETH`);
  
  // Test parameters for a new token
  const testParams = {
    asset: "0xdef1aa0fb7b7c09a5fc3e28625d7a1a2b0012d6a", // DEFLIQ token
    name: "DEFLIQ Lending Pool",
    symbol: "dDEFLIQ",
    collateralFactorBps: 7500, // 75%
    reserveFactorBps: 1000     // 10%
  };
  
  console.log("\nCreating pool with parameters:");
  console.log(`Asset: ${testParams.asset}`);
  console.log(`Name: ${testParams.name}`);
  console.log(`Symbol: ${testParams.symbol}`);
  console.log(`Collateral Factor: ${testParams.collateralFactorBps} bps (${testParams.collateralFactorBps/100}%)`);
  console.log(`Reserve Factor: ${testParams.reserveFactorBps} bps (${testParams.reserveFactorBps/100}%)`);
  
  // Check if pool already exists
  const existingPool = await factory.assetToPools(testParams.asset);
  if (existingPool !== "0x0000000000000000000000000000000000000000") {
    console.log(`\nPool already exists for asset at: ${existingPool}`);
    return;
  }
  
  try {
    // Create the pool
    console.log("\nSubmitting transaction to create pool...");
    const tx = await factory.createLendingPool(
      testParams.asset,
      testParams.name,
      testParams.symbol,
      testParams.collateralFactorBps,
      testParams.reserveFactorBps,
      { value: fee }
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Waiting for transaction confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed with status: ${receipt.status === 1 ? 'success' : 'failed'}`);
    
    if (receipt.status === 1) {
      // Check the new pool address
      const newPool = await factory.assetToPools(testParams.asset);
      console.log(`\nNew pool created at: ${newPool}`);
    }
  } catch (error) {
    console.error(`\nError creating pool: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 