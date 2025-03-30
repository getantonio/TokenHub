const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther, parseEther } = require("ethers");

async function main() {
  console.log("Redeploying all contracts and creating a lending pool...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${formatEther(balance)} ETH`);
  
  // STEP 1: Deploy the mock price oracle
  console.log("Deploying MockPriceOracle...");
  const MockPriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log(`MockPriceOracle deployed to: ${priceOracleAddress}`);
  
  // STEP 2: Deploy the mock interest rate model
  console.log("Deploying MockInterestRateModel...");
  const baseRate = 200; // 2% base rate
  const multiplier = 1000; // 10% slope 
  const jumpMultiplier = 2000; // 20% jump multiplier
  const kink = 8000; // 80% kink
  
  const MockInterestRateModel = await hre.ethers.getContractFactory("MockInterestRateModel");
  const interestRateModel = await MockInterestRateModel.deploy(baseRate, multiplier, jumpMultiplier, kink);
  await interestRateModel.waitForDeployment();
  const interestRateModelAddress = await interestRateModel.getAddress();
  console.log(`MockInterestRateModel deployed to: ${interestRateModelAddress}`);
  
  // STEP 3: Deploy the fee collector
  console.log("Deploying FeeCollector...");
  const FeeCollector = await hre.ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy();
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log(`FeeCollector deployed to: ${feeCollectorAddress}`);
  
  // STEP 4: Deploy the lending pool implementation
  console.log("Deploying LendingPool implementation...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPoolImpl = await LendingPool.deploy();
  await lendingPoolImpl.waitForDeployment();
  const lendingPoolImplAddress = await lendingPoolImpl.getAddress();
  console.log(`LendingPool implementation deployed to: ${lendingPoolImplAddress}`);
  
  // STEP 5: Deploy the factory
  console.log("Deploying LoanPoolFactory...");
  const LoanPoolFactory = await hre.ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    lendingPoolImplAddress,
    priceOracleAddress,
    interestRateModelAddress,
    feeCollectorAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`LoanPoolFactory deployed to: ${factoryAddress}`);
  
  // Authorize the factory to collect fees
  console.log("Authorizing factory to collect fees...");
  const authTx = await feeCollector.authorizeCaller(factoryAddress);
  await authTx.wait();
  console.log("Factory authorized successfully");
  
  // STEP 6: Deploy a test token
  console.log("Deploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy("Test USD", "TUSD", 18);
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log(`TestToken deployed to: ${testTokenAddress}`);
  
  // STEP 7: Mint test tokens
  console.log("Minting 1,000,000 TUSD to the deployer...");
  const mintTx = await testToken.mint(deployer.address, parseEther("1000000"));
  await mintTx.wait();
  const balance1 = await testToken.balanceOf(deployer.address);
  console.log(`Deployer token balance: ${formatEther(balance1)} TUSD`);
  
  // STEP 8: Set fee to zero for easy testing
  console.log("Setting pool creation fee to 0...");
  const setFeeTx = await feeCollector.setPoolCreationFee(0);
  await setFeeTx.wait();
  const newFee = await feeCollector.getPoolCreationFee();
  console.log(`Pool creation fee: ${formatEther(newFee)} ETH`);
  
  // STEP 9: Create a lending pool
  console.log("Creating a lending pool...");
  const poolName = "Test USD Lending Pool";
  const poolSymbol = "tUSDLP";
  const collateralFactorBps = 7500; // 75%
  const reserveFactorBps = 1000; // 10%
  
  console.log(`Lending pool parameters:`);
  console.log(`- Name: ${poolName}`);
  console.log(`- Symbol: ${poolSymbol}`);
  console.log(`- Collateral factor: ${collateralFactorBps / 100}%`);
  console.log(`- Reserve factor: ${reserveFactorBps / 100}%`);
  
  const tx = await factory.createLendingPool(
    testTokenAddress,
    poolName,
    poolSymbol,
    collateralFactorBps,
    reserveFactorBps,
    { value: 0 }
  );
  
  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Waiting for transaction confirmation...");
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  
  // Find the PoolCreated event
  let poolAddress;
  for (const log of receipt.logs) {
    try {
      const parsedLog = factory.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      if (parsedLog && parsedLog.name === "PoolCreated") {
        poolAddress = parsedLog.args.pool;
        break;
      }
    } catch (e) {
      // Continue to next log if this one can't be parsed
      continue;
    }
  }
  
  if (!poolAddress) {
    throw new Error("Failed to find pool address in transaction logs");
  }
  
  console.log(`Lending pool created at address: ${poolAddress}`);
  
  // STEP 10: Save deployment information
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    priceOracle: priceOracleAddress,
    interestRateModel: interestRateModelAddress,
    feeCollector: feeCollectorAddress,
    lendingPoolImpl: lendingPoolImplAddress,
    factory: factoryAddress,
    testToken: testTokenAddress,
    lendingPool: poolAddress
  };
  
  // Ensure deployments directory exists
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }
  
  // Save deployment data
  const filePath = path.join(deploymentDir, `full-deployment-${hre.network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment data saved to ${filePath}`);
  
  console.log("\nSuccess! You can now interact with the lending pool.");
  console.log(`Factory Address: ${factoryAddress}`);
  console.log(`Test Token: ${testTokenAddress}`);
  console.log(`Lending Pool: ${poolAddress}`);
  
  console.log("\nUpdate your .env.local file with:");
  console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_EXAMPLE_POOL_ADDRESS=${poolAddress}`);
  console.log(`NEXT_PUBLIC_EXAMPLE_TOKEN_ADDRESS=${testTokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 