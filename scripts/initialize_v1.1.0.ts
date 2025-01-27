const { ethers } = require("hardhat");

async function main() {
  const factoryAddress = "0x71C57cEdbf3952423369e6aE036Da600a521a0dE";

  console.log("Initializing TokenFactory_v1.1.0...");
  console.log("Factory Address:", factoryAddress);

  const factory = await ethers.getContractAt("TokenFactory_v1_1_0", factoryAddress);
  
  console.log("Calling initialize...");
  const tx = await factory.initialize();
  await tx.wait();
  
  console.log("Factory initialized successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 