/**
 * DEPLOYMENT SCRIPT - REQUIRES PRIVATE KEY
 * This script is used only for deploying and initializing the factory contract.
 * It requires a private key with deployment permissions.
 */

require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required for deployment");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Initializing factory with account:", deployer.address);

  // Contract addresses
  const factoryAddress = "0x9df49990d25dF8c5c2948DAf7d1Ff95700f970d9";
  const templateAddress = "0x3a805D7592d8085c81B03e3022e2792E64cEF9AF";
  
  // Get the factory contract
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(factoryAddress);

  try {
    // Initialize the factory
    console.log("Initializing factory with template:", templateAddress);
    const tx = await factory.initialize(templateAddress);
    await tx.wait();
    console.log("Factory initialized successfully");

    // Set deployment fee to 0.001 BNB
    console.log("Setting deployment fee...");
    const setFeeTx = await factory.setDeploymentFee(ethers.parseEther("0.001"));
    await setFeeTx.wait();
    console.log("Deployment fee set to 0.001 BNB");

    // Verify the setup
    const impl = await factory.implementation();
    const fee = await factory.deploymentFee();
    console.log("\nVerification:");
    console.log("Implementation:", impl);
    console.log("Deployment Fee:", ethers.formatEther(fee), "BNB");
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 