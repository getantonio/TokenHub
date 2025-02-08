const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating deployment fee with account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x9A3C81bF993701250d35072182E58c3A35F30239"; // Current TokenFactory_v3_clone address
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_clone");
  const factory = TokenFactory.attach(factoryAddress);

  try {
    // Get current fee
    const currentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(currentFee), "ETH");

    // Set new fee to 0.0001 ETH
    const newFee = ethers.parseEther("0.0001");
    const tx = await factory.setDeploymentFee(newFee);
    console.log("Update fee transaction hash:", tx.hash);

    // Wait for transaction to be mined
    console.log("Waiting for transaction confirmation...");
    await tx.wait();

    // Verify new fee
    const updatedFee = await factory.deploymentFee();
    console.log("New deployment fee:", ethers.formatEther(updatedFee), "ETH");

  } catch (error) {
    console.error("Error updating deployment fee:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 