const hre = require("hardhat");
const { writeFileSync } = require("fs");
const { join } = require("path");

async function main() {
  console.log("Deploying V3 contracts to network:", hre.network.name);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy TokenTemplate_v3
  console.log("\nDeploying TokenTemplate_v3...");
  const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v3");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log("TokenTemplate_v3 deployed to:", templateAddress);

  // Deploy TokenFactory_v3
  console.log("\nDeploying TokenFactory_v3...");
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v3");
  const factory = await TokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v3 deployed to:", factoryAddress);

  // Initialize factory with template address
  console.log("\nInitializing factory...");
  const initTx = await factory.initialize(templateAddress);
  await initTx.wait();
  console.log("Factory initialized with template");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    template: templateAddress,
    factory: factoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const deploymentPath = join(__dirname, '..', 'deployments', 'v3', hre.network.name);
  writeFileSync(
    join(deploymentPath, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to:", join(deploymentPath, 'deployment.json'));
  console.log("\nDeployment completed!");
  
  // Print verification commands
  console.log("\nTo verify contracts on Etherscan:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${templateAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 