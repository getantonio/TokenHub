const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment...");

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get the deployer's balance
    const provider = ethers.provider;
    const balance = await provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "BNB");

    // First deploy the token template
    console.log("\nDeploying TokenTemplate_v3...");
    const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
    const tokenTemplate = await TokenTemplate.deploy();
    await tokenTemplate.waitForDeployment();
    
    const templateAddress = await tokenTemplate.getAddress();
    console.log("TokenTemplate_v3 deployed to:", templateAddress);

    // Now deploy the factory
    console.log("\nDeploying TokenFactory_v3...");
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
    const factory = await TokenFactory.deploy();
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v3 deployed to:", factoryAddress);

    // Verify deployment fee is set correctly
    const deploymentFee = await factory.deploymentFee();
    console.log("Deployment fee set to:", ethers.formatEther(deploymentFee), "BNB");

    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("Network: BSC Testnet");
    console.log("Token Template Address:", templateAddress);
    console.log("Factory Address:", factoryAddress);
    console.log("Deployment Fee:", ethers.formatEther(deploymentFee), "BNB");
    console.log("\nVerification commands:");
    console.log(`npx hardhat verify --network bscTestnet ${templateAddress}`);
    console.log(`npx hardhat verify --network bscTestnet ${factoryAddress}`);

    console.log("\nEnvironment Variables:");
    console.log("-------------------");
    console.log(`NEXT_PUBLIC_BSCTESTNET_TOKEN_TEMPLATE_ADDRESS_V3=${templateAddress}`);
    console.log(`NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3=${factoryAddress}`);

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 