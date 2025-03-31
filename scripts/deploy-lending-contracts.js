// Simple deployment script for lending contracts
const hre = require("hardhat");

async function main() {
  console.log("Deploying lending contracts to Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(deployerBalance)} ETH`);

  // Deploy mock price oracle
  console.log("Deploying mock price oracle...");
  const PriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log(`Price Oracle deployed to: ${priceOracleAddress}`);

  // Deploy mock interest rate model
  console.log("Deploying mock interest rate model...");
  const InterestRateModel = await hre.ethers.getContractFactory("MockInterestRateModel");
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  const interestRateModelAddress = await interestRateModel.getAddress();
  console.log(`Interest Rate Model deployed to: ${interestRateModelAddress}`);

  // Deploy lending pool implementation
  console.log("Deploying lending pool implementation...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log(`Lending Pool implementation deployed to: ${lendingPoolAddress}`);

  // Deploy fee collector
  console.log("Deploying fee collector...");
  const FeeCollector = await hre.ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(
    deployer.address, // treasury
    hre.ethers.parseEther("0"), // pool creation fee - 0 ETH for easier testing
    1000 // protocol fee percentage - 10%
  );
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log(`Fee Collector deployed to: ${feeCollectorAddress}`);

  // Deploy factory
  console.log("Deploying loan pool factory...");
  const LoanPoolFactory = await hre.ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    lendingPoolAddress,
    priceOracleAddress,
    interestRateModelAddress,
    feeCollectorAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`Loan Pool Factory deployed to: ${factoryAddress}`);

  // Summary
  console.log("\nDeployment Summary:");
  console.log(`Price Oracle: ${priceOracleAddress}`);
  console.log(`Interest Rate Model: ${interestRateModelAddress}`);
  console.log(`Lending Pool Implementation: ${lendingPoolAddress}`);
  console.log(`Fee Collector: ${feeCollectorAddress}`);
  console.log(`Loan Pool Factory: ${factoryAddress}`);
  
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 