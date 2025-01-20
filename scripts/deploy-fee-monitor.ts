const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  try {
    const signers = await ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error("No signers available. Please check your PRIVATE_KEY in .env");
    }
    const deployer = signers[0];
    console.log("Deploying FeeMonitor with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    const FeeMonitor = await ethers.getContractFactory("FeeMonitor", deployer);
    console.log("Deploying contract...");
    const monitor = await FeeMonitor.deploy();
    console.log("Waiting for deployment transaction...");
    await monitor.waitForDeployment();

    const address = await monitor.getAddress();
    console.log("\nFeeMonitor deployed to:", address);
    
    // Wait for a few block confirmations
    console.log("\nWaiting for block confirmations...");
    const receipt = await monitor.deploymentTransaction()?.wait(5);
    console.log("Deployment confirmed in block:", receipt.blockNumber);
    
    console.log("\nDeployment complete! Next steps:");
    console.log("1. Add this address to your .env file as NEXT_PUBLIC_FEE_MONITOR_ADDRESS");
    console.log(`2. Update your .env file with:\nNEXT_PUBLIC_FEE_MONITOR_ADDRESS=${address}`);
  } catch (error) {
    console.error("\nDeployment failed:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nScript failed:");
    console.error(error);
    process.exit(1);
  }); 