const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment of TokenFactory_v3_Enhanced on Polygon Amoy...");

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Constants for Polygon Amoy
    const QUICKSWAP_V2_ROUTER = "0xf5b509bB0909a69B1c207E495f687a596C168E12"; // QuickSwap V2 Router on Polygon Amoy
    const DEPLOYMENT_FEE = ethers.parseEther("0.0001"); // 0.0001 MATIC fee (adjust as needed)
    const FEE_RECIPIENT = deployer.address; // Fee recipient (can be changed later)

    // Deploy the factory
    console.log("Deploying TokenFactory_v3_Enhanced...");
    const Factory = await ethers.getContractFactory("TokenFactory_v3_Enhanced");
    const factory = await Factory.deploy(QUICKSWAP_V2_ROUTER, DEPLOYMENT_FEE, FEE_RECIPIENT);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v3_Enhanced deployed to:", factoryAddress);
    console.log("Deployment Fee:", ethers.formatEther(DEPLOYMENT_FEE), "MATIC");
    console.log("Fee Recipient:", FEE_RECIPIENT);
    console.log("QuickSwap V2 Router:", QUICKSWAP_V2_ROUTER);

    // Verify the contract on Polygonscan
    console.log("\nVerifying contract on Polygonscan...");
    console.log("npx hardhat verify --network amoy", factoryAddress, QUICKSWAP_V2_ROUTER, DEPLOYMENT_FEE, FEE_RECIPIENT);

  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 