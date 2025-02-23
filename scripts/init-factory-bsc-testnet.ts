const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Initializing factory with account:", deployer.address);

  // Contract addresses
  const FACTORY_ADDRESS = "0xD9dF868977ef71e7B22256993AF730bDA613544F";

  // Get the factory contract
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(FACTORY_ADDRESS);

  try {
    // Set deployment fee
    const deploymentFee = ethers.parseEther("0.001");
    console.log("Setting deployment fee to:", ethers.formatEther(deploymentFee), "BNB");
    const tx = await factory.setDeploymentFee(deploymentFee);
    await tx.wait();
    console.log("Deployment fee set successfully");

    // Verify the fee was set
    const fee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(fee), "BNB");
  } catch (error) {
    console.error("Error setting deployment fee:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 