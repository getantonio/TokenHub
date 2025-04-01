// Directly deploy and initialize a pool
const { ethers } = require('hardhat');

async function main() {
  console.log("Directly deploying and initializing a lending pool...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const priceOracleAddress = deploymentData.priceOracle;
  const interestRateModelAddress = deploymentData.interestRateModel;
  const feeCollectorAddress = deploymentData.feeCollector;
  
  console.log(`PriceOracle address: ${priceOracleAddress}`);
  console.log(`InterestRateModel address: ${interestRateModelAddress}`);
  console.log(`FeeCollector address: ${feeCollectorAddress}`);
  
  // Deploy implementation
  console.log("\nDeploying LendingPool contract...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy();
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log(`LendingPool deployed to: ${poolAddress}`);
  
  // Test parameters
  const testParams = {
    asset: "0xdef1aa0fb7b7c09a5fc3e28625d7a1a2b0012d6a", // DEFLIQ token
    name: "DEFLIQ Lending Pool",
    symbol: "dDEFLIQ",
    collateralFactorBps: 7500, // 75%
    reserveFactorBps: 1000     // 10%
  };
  
  console.log("\nInitializing with parameters:");
  console.log(`Asset: ${testParams.asset}`);
  console.log(`Name: ${testParams.name}`);
  console.log(`Symbol: ${testParams.symbol}`);
  console.log(`Collateral Factor: ${testParams.collateralFactorBps} bps`);
  console.log(`Reserve Factor: ${testParams.reserveFactorBps} bps`);
  
  // Initialize pool
  try {
    console.log("\nInitializing pool...");
    const tx = await pool.initialize(
      testParams.asset,
      testParams.name,
      testParams.symbol,
      testParams.collateralFactorBps,
      testParams.reserveFactorBps,
      priceOracleAddress,
      interestRateModelAddress,
      feeCollectorAddress
    );
    
    await tx.wait();
    console.log("Pool initialized successfully!");
    
    // Verify pool configuration
    const asset = await pool.asset();
    const collateralFactor = await pool.collateralFactorBps();
    const reserveFactor = await pool.reserveFactorBps();
    const priceOracle = await pool.priceOracle();
    const interestRateModel = await pool.interestRateModel();
    const feeCollector = await pool.feeCollector();
    const owner = await pool.owner();
    
    console.log("\nPool configuration:");
    console.log(`Asset: ${asset}`);
    console.log(`Collateral Factor: ${collateralFactor} bps`);
    console.log(`Reserve Factor: ${reserveFactor} bps`);
    console.log(`Price Oracle: ${priceOracle}`);
    console.log(`Interest Rate Model: ${interestRateModel}`);
    console.log(`Fee Collector: ${feeCollector}`);
    console.log(`Owner: ${owner}`);
    console.log(`Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
  } catch (error) {
    console.error("Error initializing pool:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 