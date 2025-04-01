const { ethers } = require('hardhat');

async function main() {
  console.log("Checking pool creation parameters...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  const feeCollectorAddress = deploymentData.feeCollector;
  const priceOracleAddress = deploymentData.priceOracle;
  const interestRateModelAddress = deploymentData.interestRateModel;
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`FeeCollector address: ${feeCollectorAddress}`);
  console.log(`PriceOracle address: ${priceOracleAddress}`);
  console.log(`InterestRateModel address: ${interestRateModelAddress}`);
  
  // Create contract instances
  const factoryABI = [
    "function createLendingPool(address, string, string, uint256, uint256) external payable returns (address)",
    "function feeCollector() external view returns (address)",
    "function priceOracle() external view returns (address)",
    "function interestRateModel() external view returns (address)",
    "function implementation() external view returns (address)",
    "function getPoolCreationFee() external view returns (uint256)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Test parameters
  const testParams = {
    asset: "0xdef1aa0fb7b7c09a5fc3e28625d7a1a2b0012d6a", // DEFLIQ token
    name: "DEFLIQ Lending Pool",
    symbol: "dDEFLIQ",
    collateralFactorBps: 7500, // 75%
    reserveFactorBps: 1000     // 10%
  };
  
  console.log("\nTesting with parameters:");
  console.log(`Asset: ${testParams.asset}`);
  console.log(`Name: ${testParams.name}`);
  console.log(`Symbol: ${testParams.symbol}`);
  console.log(`Collateral Factor: ${testParams.collateralFactorBps} bps (${testParams.collateralFactorBps/100}%)`);
  console.log(`Reserve Factor: ${testParams.reserveFactorBps} bps (${testParams.reserveFactorBps/100}%)`);
  
  // Check if values match what's configured in factory
  console.log("\nChecking factory configuration:");
  try {
    const configuredFeeCollector = await factory.feeCollector();
    console.log(`Configured FeeCollector: ${configuredFeeCollector}`);
    console.log(`Matches deployment: ${configuredFeeCollector.toLowerCase() === feeCollectorAddress.toLowerCase()}`);
    
    const configuredPriceOracle = await factory.priceOracle();
    console.log(`Configured PriceOracle: ${configuredPriceOracle}`);
    console.log(`Matches deployment: ${configuredPriceOracle.toLowerCase() === priceOracleAddress.toLowerCase()}`);
    
    const configuredInterestRateModel = await factory.interestRateModel();
    console.log(`Configured InterestRateModel: ${configuredInterestRateModel}`);
    console.log(`Matches deployment: ${configuredInterestRateModel.toLowerCase() === interestRateModelAddress.toLowerCase()}`);
  } catch (e) {
    console.error("Error checking factory configuration:", e.message);
  }
  
  // Check implementation
  try {
    const implementation = await factory.implementation();
    console.log(`\nImplementation address: ${implementation}`);
    
    // Get implementation code
    const implementationCode = await ethers.provider.getCode(implementation);
    console.log(`Implementation code size: ${implementationCode.length} bytes`);
  } catch (e) {
    console.error("Error checking implementation:", e.message);
  }
  
  // Try to estimate gas for the transaction
  try {
    console.log("\nEstimating gas for pool creation...");
    const gasEstimate = await factory.createLendingPool.estimateGas(
      testParams.asset,
      testParams.name,
      testParams.symbol,
      testParams.collateralFactorBps,
      testParams.reserveFactorBps,
      { value: ethers.parseEther("0.05") } // Include pool creation fee
    );
    console.log(`Estimated gas: ${gasEstimate}`);
  } catch (e) {
    console.error("Error estimating gas:", e.message);
    
    // Try to get more details about the revert
    try {
      await factory.createLendingPool.staticCall(
        testParams.asset,
        testParams.name,
        testParams.symbol,
        testParams.collateralFactorBps,
        testParams.reserveFactorBps,
        { value: ethers.parseEther("0.05") }
      );
    } catch (staticCallError) {
      console.error("Static call error details:", staticCallError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 