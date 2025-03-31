// Simple deployment script for lending contracts
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying lending contracts to Sepolia...");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  console.log(`Deployer address: ${deployer.address}`);
  
  // Deploy mock ERC20 token for testing
  console.log("Deploying mock ERC20 token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`Mock Token deployed to: ${mockTokenAddress}`);
  
  // Deploy mock price oracle
  console.log("Deploying mock price oracle...");
  const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log(`Price Oracle deployed to: ${priceOracleAddress}`);

  // Deploy mock interest rate model
  console.log("Deploying mock interest rate model...");
  const InterestRateModel = await ethers.getContractFactory("MockInterestRateModel");
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  const interestRateModelAddress = await interestRateModel.getAddress();
  console.log(`Interest Rate Model deployed to: ${interestRateModelAddress}`);

  // Deploy lending pool implementation
  console.log("Deploying lending pool implementation...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log(`Lending Pool implementation deployed to: ${lendingPoolAddress}`);

  // Deploy fee collector
  console.log("Deploying fee collector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(
    deployer.address, // treasury
    ethers.parseEther("0"), // pool creation fee - 0 ETH for easier testing
    1000 // protocol fee percentage - 10%
  );
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log(`Fee Collector deployed to: ${feeCollectorAddress}`);

  // Deploy factory
  console.log("Deploying loan pool factory...");
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    lendingPoolAddress,
    priceOracleAddress,
    interestRateModelAddress,
    feeCollectorAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`Loan Pool Factory deployed to: ${factoryAddress}`);

  // Mint some tokens to the deployer for testing
  console.log("Minting tokens to deployer...");
  const mockTokenWithSigner = mockToken.connect(deployer);
  const mintTx = await mockTokenWithSigner.mint(deployer.address, ethers.parseEther("1000000"));
  await mintTx.wait();
  console.log("Tokens minted successfully.");

  // Summary
  console.log("\nDeployment Summary:");
  console.log(`Mock Token: ${mockTokenAddress}`);
  console.log(`Price Oracle: ${priceOracleAddress}`);
  console.log(`Interest Rate Model: ${interestRateModelAddress}`);
  console.log(`Lending Pool Implementation: ${lendingPoolAddress}`);
  console.log(`Fee Collector: ${feeCollectorAddress}`);
  console.log(`Loan Pool Factory: ${factoryAddress}`);
  
  console.log("\nAdd this to your .env.local or .env file:");
  console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 