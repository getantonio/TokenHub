const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Initializing factory with account:", deployer.address);

  // Contract addresses - Replace these with your deployed contract addresses
  const FACTORY_ADDRESS = process.env.SEPOLIA_FACTORY_ADDRESS;
  const TEMPLATE_ADDRESS = process.env.SEPOLIA_TEMPLATE_ADDRESS;

  if (!FACTORY_ADDRESS || !TEMPLATE_ADDRESS) {
    throw new Error("Factory or template address not set in environment variables");
  }

  // Get the factory contract
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(FACTORY_ADDRESS);

  try {
    // Initialize the factory with template
    console.log("Initializing factory with template:", TEMPLATE_ADDRESS);
    const initTx = await factory.initialize(TEMPLATE_ADDRESS);
    await initTx.wait();
    console.log("Factory initialized successfully");

    // Set deployment fee (0.001 ETH)
    const deploymentFee = ethers.parseEther("0.001");
    console.log("Setting deployment fee to:", ethers.formatEther(deploymentFee), "ETH");
    const tx = await factory.setDeploymentFee(deploymentFee);
    await tx.wait();
    console.log("Deployment fee set successfully");

    // Verify the setup
    const impl = await factory.implementation();
    const fee = await factory.deploymentFee();
    console.log("\nVerification:");
    console.log("Implementation:", impl);
    console.log("Current deployment fee:", ethers.formatEther(fee), "ETH");
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