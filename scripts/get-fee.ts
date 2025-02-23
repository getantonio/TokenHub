const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Checking deployment fee...");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Get the factory contract
    const factoryAddress = "0xF2473a2a1E2e7c1c2Ce0500d447f12Ec92Ab21cF"; // BSC testnet V3 factory
    console.log("Using factory address:", factoryAddress);

    const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
    const factory = TokenFactory.attach(factoryAddress);

    // Get current fee
    const currentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(currentFee), "BNB");

  } catch (error) {
    console.error("Error details:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 