const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating implementation with account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0xb307e4321CD1DC291C5dcadC4EfCFD410C5b5cD2"; // Latest TokenFactory_v3 address
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(factoryAddress);

  // New implementation address
  const newImplementation = "0xFfD47805f6d6834a48A0EFcE252381132Aa76C89"; // Latest TokenTemplate_v3 address

  try {
    // Update implementation
    console.log("Updating implementation to:", newImplementation);
    const tx = await factory.updateImplementation(newImplementation);
    await tx.wait();
    console.log("Implementation updated successfully");

    // Verify the update
    const currentImpl = await factory.implementation();
    console.log("Current implementation:", currentImpl);
  } catch (error) {
    console.error("Error updating implementation:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 