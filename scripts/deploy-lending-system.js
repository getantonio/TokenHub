// Deploy script for the entire lending pool system
// This script deploys all necessary contracts in the correct order with proper configuration

const { ethers } = require('hardhat');
const { parseEther } = require('ethers/lib/utils');

async function main() {
  console.log("\n=== DEPLOYING LENDING POOL SYSTEM ===\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Deploy mock dependencies if needed (for testing purposes)
  console.log("\n1. Deploying mock dependencies...");
  
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
  
  // Set initial prices in the oracle for testing (optional)
  // await priceOracle.setPrice("0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056", parseEther("1")); // 1 USD per token
  
  // 2. Deploy implementation contract (LendingPool)
  console.log("\n2. Deploying LendingPool implementation...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPoolImplementation = await LendingPool.deploy();
  await lendingPoolImplementation.deployed();
  console.log(`   LendingPool implementation deployed to: ${lendingPoolImplementation.address}`);
  
  // 3. Deploy Fee Collector
  console.log("\n3. Deploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  
  // Set fee collector parameters
  const treasury = deployer.address; // Set treasury to deployer for now
  const poolCreationFee = parseEther("0"); // Set to 0 for easier testing (can be changed later)
  const protocolFeePercentage = 1000; // 10% - expressed in basis points (1% = 100)
  
  const feeCollector = await FeeCollector.deploy(
    treasury,
    poolCreationFee,
    protocolFeePercentage
  );
  await feeCollector.deployed();
  console.log(`   FeeCollector deployed to: ${feeCollector.address}`);
  console.log(`   Pool creation fee: ${ethers.utils.formatEther(poolCreationFee)} ETH`);
  console.log(`   Protocol fee percentage: ${protocolFeePercentage / 100}%`);
  console.log(`   Treasury address: ${treasury}`);
  
  // 4. Deploy Factory with all the necessary components
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
  
  // 5. Set permissions and final configuration
  console.log("\n5. Setting up permissions and configuration...");
  
  // Verify the correct owner
  const factoryOwner = await factory.owner();
  console.log(`   Factory owner: ${factoryOwner}`);
  
  if (factoryOwner !== deployer.address) {
    console.warn("   Warning: Factory owner is not the deployer!");
  } else {
    console.log("   ✅ Factory owner is correctly set to deployer");
  }
  
  // Verify factory has been set up correctly
  const implementation = await factory.implementation();
  const factoryFeeCollector = await factory.feeCollector();
  
  console.log(`   Implementation address in factory: ${implementation}`);
  console.log(`   FeeCollector address in factory: ${factoryFeeCollector}`);
  
  // Verify pool creation fee
  const currentFee = await feeCollector.getPoolCreationFee();
  console.log(`   Verified pool creation fee: ${ethers.utils.formatEther(currentFee)} ETH`);
  
  // Deploy a test token for pool creation
  console.log("\n6. Deploying test token...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const testToken = await MockToken.deploy("Test Lending Token", "TLT", 18);
  await testToken.deployed();
  console.log(`   Test token deployed to: ${testToken.address}`);
  
  // Mint some tokens to deployer
  const mintAmount = parseEther("1000000"); // 1 million tokens
  await testToken.mint(deployer.address, mintAmount);
  console.log(`   Minted ${ethers.utils.formatEther(mintAmount)} tokens to deployer`);
  
  // Create a test pool
  console.log("\n7. Creating test lending pool...");
  
  try {
    // Prepare pool parameters
    const poolName = "Test Lending Pool";
    const poolSymbol = "TLP";
    const collateralFactorBps = 7500; // 75%
    const reserveFactorBps = 1000; // 10%
    
    console.log(`   Pool Name: ${poolName}`);
    console.log(`   Pool Symbol: ${poolSymbol}`);
    console.log(`   Collateral Factor: ${collateralFactorBps / 100}%`);
    console.log(`   Reserve Factor: ${reserveFactorBps / 100}%`);
    console.log(`   Asset: ${testToken.address}`);
    
    // Create the pool
    const tx = await factory.createLendingPool(
      testToken.address,
      poolName,
      poolSymbol,
      collateralFactorBps,
      reserveFactorBps,
      { value: currentFee }  // Pass the current fee
    );
    
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`   Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get the pool address from the logs
    const poolCreatedEvent = receipt.events.find(event => event.event === "PoolCreated");
    if (poolCreatedEvent) {
      const poolAddress = poolCreatedEvent.args.pool;
      console.log(`   ✅ Pool successfully created at address: ${poolAddress}`);
    } else {
      console.log("   Could not find PoolCreated event in logs");
    }
    
  } catch (error) {
    console.error("   Failed to create test pool:", error.message);
    console.log("   The contracts are deployed correctly but test pool creation failed");
  }
  
  // Summary of deployed contracts
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Price Oracle: ${priceOracle.address}`);
  console.log(`Interest Rate Model: ${interestRateModel.address}`);
  console.log(`LendingPool Implementation: ${lendingPoolImplementation.address}`);
  console.log(`FeeCollector: ${feeCollector.address}`);
  console.log(`LoanPoolFactory: ${factory.address}`);
  console.log(`Test Token: ${testToken.address}`);
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