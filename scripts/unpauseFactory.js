const { ethers } = require("hardhat");

async function main() {
  // The address of the deployed contract from the previous deployment
  const FACTORY_ADDRESS = "0xFf86c158F0cD14b1a2d18AEf8038527f71c4383b";
  
  console.log("Connecting to TokenFactory_v3 contract at:", FACTORY_ADDRESS);
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  
  // Attach to the deployed contract
  const factory = await TokenFactory.attach(FACTORY_ADDRESS);
  
  console.log("Unpausing the factory...");
  const unpauseTx = await factory.unpause();
  await unpauseTx.wait();
  
  console.log("Factory unpaused successfully");
  console.log("The factory is now ready to create tokens with proper wallet allocations");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 