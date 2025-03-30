const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther, parseUnits } = require("ethers");

async function main() {
  console.log("Starting deployment of lending factory contracts...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${formatEther(balance)} ETH`);
  
  // Deploy MockPriceOracle
  console.log("Deploying MockPriceOracle...");
  const MockPriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy();
  console.log(`MockPriceOracle deployed to: ${await priceOracle.getAddress()}`);
  
  // Deploy MockInterestRateModel
  console.log("Deploying MockInterestRateModel...");
  const baseRate = 200; // 2% base rate
  const multiplier = 1000; // 10% slope 
  const jumpMultiplier = 2000; // 20% jump multiplier
  const kink = 8000; // 80% kink
  
  const MockInterestRateModel = await hre.ethers.getContractFactory("MockInterestRateModel");
  const interestRateModel = await MockInterestRateModel.deploy(baseRate, multiplier, jumpMultiplier, kink);
  console.log(`MockInterestRateModel deployed to: ${await interestRateModel.getAddress()}`);
  
  // Deploy FeeCollector
  console.log("Deploying FeeCollector...");
  const FeeCollector = await hre.ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy();
  console.log(`FeeCollector deployed to: ${await feeCollector.getAddress()}`);
  
  // Deploy LendingPool implementation
  console.log("Deploying LendingPool implementation...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPoolImpl = await LendingPool.deploy();
  console.log(`LendingPool implementation deployed to: ${await lendingPoolImpl.getAddress()}`);
  
  // Deploy LoanPoolFactory
  console.log("Deploying LoanPoolFactory...");
  const LoanPoolFactory = await hre.ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    await lendingPoolImpl.getAddress(),
    await priceOracle.getAddress(),
    await interestRateModel.getAddress(),
    await feeCollector.getAddress()
  );
  console.log(`LoanPoolFactory deployed to: ${await factory.getAddress()}`);
  
  // Deploy TestToken (for testing)
  console.log("Deploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy("Test USD", "TUSD", 18);
  
  // Mint some tokens to deployer
  const mintAmount = parseUnits("1000000", 18); // 1 million tokens
  await testToken.mint(deployer.address, mintAmount);
  console.log(`TestToken deployed to: ${await testToken.getAddress()}`);
  
  // Save deployment information to file
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    priceOracle: await priceOracle.getAddress(),
    interestRateModel: await interestRateModel.getAddress(),
    feeCollector: await feeCollector.getAddress(),
    lendingPoolImpl: await lendingPoolImpl.getAddress(),
    factory: await factory.getAddress(),
    testToken: await testToken.getAddress()
  };
  
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }
  
  const filePath = path.join(deploymentDir, `defi-${hre.network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${filePath}`);
  
  console.log("All contracts deployed successfully!");
  console.log("-----------------------------------");
  console.log("To create a lending pool, use the factory address in your .env.local file:");
  console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${await factory.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 