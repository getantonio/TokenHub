const { ethers } = require("hardhat");

async function main() {
  try {
    const factoryAddress = "0x9df49990d25dF8c5c2948DAf7d1Ff95700f970d9";
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Setting up factory with account:", deployer.address);
    
    // Get the factory contract
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
    const factory = TokenFactory.attach(factoryAddress);

    // Set deployment fee to 0.001 BNB
    console.log("Setting deployment fee...");
    const setFeeTx = await factory.setDeploymentFee(ethers.parseEther("0.001"));
    await setFeeTx.wait();
    console.log("Deployment fee set to 0.001 BNB");

    // Verify the setup
    const fee = await factory.deploymentFee();
    console.log("\nVerification:");
    console.log("Deployment Fee:", ethers.formatEther(fee), "BNB");
    
    // Get version
    const version = await factory.VERSION();
    console.log("Factory Version:", version);
  } catch (error) {
    console.error("Error:", error.message);
    // Log more detailed error information if available
    if (error.error) {
      console.error("Additional error details:", error.error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 