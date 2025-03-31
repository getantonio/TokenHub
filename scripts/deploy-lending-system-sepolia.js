// Deploy script for the lending pool system on Sepolia
// This is a simplified version that uses existing contracts when possible

const { ethers } = require('hardhat');
const { parseEther } = require('ethers/lib/utils');

async function main() {
  console.log("\n=== DEPLOYING LENDING POOL SYSTEM TO SEPOLIA ===\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Deploy mock dependencies
  console.log("\n1. Deploying dependencies...");
  
  // Deploy mock price oracle
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy();
  await priceOracle.deployed();
  console.log(`   MockPriceOracle deployed to: ${priceOracle.address}`);
  
  // Deploy mock interest rate model
  const MockInterestRateModel = await ethers.getContractFactory("MockInterestRateModel");
  const interestRateModel = await MockInterestRateModel.deploy();
  await interestRateModel.deployed();
  console.log(`   MockInterestRateModel deployed to: ${interestRateModel.address}`);
  
  // 2. Deploy implementation contract
  console.log("\n2. Deploying LendingPool implementation...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPoolImplementation = await LendingPool.deploy();
  await lendingPoolImplementation.deployed();
  console.log(`   LendingPool implementation deployed to: ${lendingPoolImplementation.address}`);
  
  // 3. Deploy Fee Collector
  console.log("\n3. Deploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  
  // Set fee collector parameters
  const treasury = deployer.address; // Set treasury to deployer
  const poolCreationFee = parseEther("0"); // Set to 0 for easier testing
  const protocolFeePercentage = 1000; // 10%
  
  const feeCollector = await FeeCollector.deploy(
    treasury,
    poolCreationFee,
    protocolFeePercentage
  );
  await feeCollector.deployed();
  console.log(`   FeeCollector deployed to: ${feeCollector.address}`);
  console.log(`   Pool creation fee: ${ethers.utils.formatEther(poolCreationFee)} ETH`);
  console.log(`   Protocol fee percentage: ${protocolFeePercentage / 100}%`);
  
  // 4. Deploy Factory
  console.log("\n4. Deploying LoanPoolFactory...");
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    lendingPoolImplementation.address,
    priceOracle.address,
    interestRateModel.address,
    feeCollector.address
  );
  await factory.deployed();
  console.log(`   LoanPoolFactory deployed to: ${factory.address}`);
  
  // 5. Set permissions and verify
  console.log("\n5. Verifying configuration...");
  
  // Verify factory owner
  const factoryOwner = await factory.owner();
  console.log(`   Factory owner: ${factoryOwner}`);
  
  if (factoryOwner !== deployer.address) {
    console.warn("   Warning: Factory owner is not the deployer!");
  } else {
    console.log("   ✅ Factory owner is correctly set to deployer");
  }
  
  // Verify implementation
  const implementation = await factory.implementation();
  console.log(`   Implementation address in factory: ${implementation}`);
  
  if (implementation !== lendingPoolImplementation.address) {
    console.warn("   Warning: Implementation address mismatch!");
  } else {
    console.log("   ✅ Implementation address correctly set");
  }
  
  // Verify fee collector
  const factoryFeeCollector = await factory.feeCollector();
  console.log(`   FeeCollector address in factory: ${factoryFeeCollector}`);
  
  if (factoryFeeCollector !== feeCollector.address) {
    console.warn("   Warning: FeeCollector address mismatch!");
  } else {
    console.log("   ✅ FeeCollector address correctly set");
  }
  
  // Verify pool creation fee
  const currentFee = await feeCollector.getPoolCreationFee();
  console.log(`   Pool creation fee: ${ethers.utils.formatEther(currentFee)} ETH`);
  
  // Print summary of deployed contracts
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Price Oracle: ${priceOracle.address}`);
  console.log(`Interest Rate Model: ${interestRateModel.address}`);
  console.log(`LendingPool Implementation: ${lendingPoolImplementation.address}`);
  console.log(`FeeCollector: ${feeCollector.address}`);
  console.log(`LoanPoolFactory: ${factory.address}`);
  
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${factory.address}`);
  
  console.log("\n=== DEPLOYMENT COMPLETE ===");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 