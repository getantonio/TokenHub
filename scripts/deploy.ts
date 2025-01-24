// Import hardhat runtime environment
const hardhat = require("hardhat");

const deploy = async () => {
  const { ethers } = hardhat;

  try {
    const signers = await ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error("No signers available. Please check your PRIVATE_KEY in .env");
    }
    const deployer = signers[0];
    console.log("Deploying TokenFactory with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    const creationFee = ethers.parseEther("0.001"); // 0.001 ETH initial fee for non-owners
    console.log("Deploying TokenFactory with creation fee:", ethers.formatEther(creationFee), "ETH");

    const TokenFactory = await ethers.getContractFactory("TokenFactory", deployer);
    console.log("Deploying contract...");
    const factory = await TokenFactory.deploy(creationFee);
    console.log("Waiting for deployment transaction...");
    await factory.waitForDeployment();

    const address = await factory.getAddress();
    console.log("\nTokenFactory deployed to:", address);
    console.log("Initial creation fee:", ethers.formatEther(creationFee), "ETH");
    
    // Wait for a few block confirmations
    console.log("\nWaiting for block confirmations...");
    const deployTx = factory.deploymentTransaction();
    if (!deployTx) {
      throw new Error("Deployment transaction not found");
    }
    const receipt = await deployTx.wait(5);
    if (!receipt) {
      throw new Error("Failed to get deployment receipt");
    }
    console.log("Deployment confirmed in block:", receipt.blockNumber);
    
    console.log("\nDeployment complete! Next steps:");
    console.log("1. Add this address to your .env file as NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS");
    console.log(`2. Update your .env file with:\nNEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${address}`);
  } catch (error) {
    console.error("\nDeployment failed:");
    console.error(error);
    process.exit(1);
  }
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nScript failed:");
    console.error(error);
    process.exit(1);
  }); 