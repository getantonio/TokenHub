const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment of TokenFactory_v3_Enhanced...");

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Constants
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router on Sepolia
    const DEPLOYMENT_FEE = ethers.parseEther("0.001"); // 0.001 ETH fee
    const FEE_RECIPIENT = deployer.address; // Fee recipient (can be changed later)

    // Deploy the factory
    console.log("Deploying TokenFactory_v3_Enhanced...");
    const Factory = await ethers.getContractFactory("TokenFactory_v3_Enhanced");
    const factory = await Factory.deploy(UNISWAP_V2_ROUTER, DEPLOYMENT_FEE, FEE_RECIPIENT);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v3_Enhanced deployed to:", factoryAddress);
    console.log("Deployment Fee:", ethers.formatEther(DEPLOYMENT_FEE), "ETH");
    console.log("Fee Recipient:", FEE_RECIPIENT);
    console.log("Uniswap V2 Router:", UNISWAP_V2_ROUTER);

    // Verify the contract on Etherscan
    console.log("\nVerifying contract on Etherscan...");
    console.log("npx hardhat verify --network sepolia", factoryAddress, UNISWAP_V2_ROUTER, DEPLOYMENT_FEE, FEE_RECIPIENT);

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