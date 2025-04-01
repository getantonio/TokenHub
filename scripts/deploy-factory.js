// Deploy updated factory contract
const { ethers } = require('hardhat');

async function main() {
  console.log("Deploying updated factory contract...");
  
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
  
  // Deploy implementation first
  console.log("\nDeploying LendingPool implementation...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const implementation = await LendingPool.deploy();
  await implementation.waitForDeployment();
  console.log(`LendingPool implementation deployed to: ${await implementation.getAddress()}`);
  
  // Deploy factory
  console.log("\nDeploying LoanPoolFactory...");
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    await implementation.getAddress(),
    priceOracleAddress,
    interestRateModelAddress,
    feeCollectorAddress
  );
  await factory.waitForDeployment();
  console.log(`LoanPoolFactory deployed to: ${await factory.getAddress()}`);
  
  // Verify ownership
  const factoryOwner = await factory.owner();
  console.log(`\nFactory owner: ${factoryOwner}`);
  console.log(`Is deployer the owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  // Update deployment data
  console.log("\nUpdating deployment data...");
  const fs = require('fs');
  const path = require('path');
  
  deploymentData.factory = await factory.getAddress();
  deploymentData.lendingPoolImplementation = await implementation.getAddress();
  
  fs.writeFileSync(
    path.join(__dirname, '../deployments/defi-sepolia.json'),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("Deployment data updated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 