require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Initializing factory with account:", deployer.address);

  // Contract addresses
  const factoryAddress = "0xA78aB1a056f15Db7a15859797372c604944F58e6";
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