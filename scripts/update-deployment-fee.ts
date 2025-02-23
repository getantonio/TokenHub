const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating deployment fee with account:", deployer.address);

  // Contract address
  const factoryAddress = "0x8Bd2E8228C277Cc2A72efB62F8Ccc4Fb9Bb3fc51";
  
  try {
    // Get the factory contract
    const factory = await ethers.getContractAt("TokenFactory_v3", factoryAddress);

    // Get current fee
    const currentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(currentFee), "BNB");

    // Set new fee to 0.001 BNB
    console.log("\nSetting new deployment fee to 0.001 BNB...");
    const tx = await factory.setDeploymentFee(ethers.parseEther("0.001"));
    await tx.wait();

    // Verify new fee
    const newFee = await factory.deploymentFee();
    console.log("New deployment fee:", ethers.formatEther(newFee), "BNB");
    
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