const hre = require("hardhat");

async function main() {
  console.log("Checking contract bytecode...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x9bAF646fb9fe4c95B51BB78Bb55d06F158b1b779";
  console.log("\nFactory address:", factoryAddress);
  
  // Get the bytecode
  const bytecode = await ethers.provider.getCode(factoryAddress);
  console.log("\nBytecode length:", bytecode.length);
  console.log("Bytecode:", bytecode);
  
  // Get the factory contract
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  // Get the implementation address
  const implementation = await factory.implementation();
  console.log("\nImplementation address:", implementation);
  
  // Get the implementation bytecode
  const implBytecode = await ethers.provider.getCode(implementation);
  console.log("\nImplementation bytecode length:", implBytecode.length);
  console.log("Implementation bytecode:", implBytecode);
  
  // Get the factory's owner
  const owner = await factory.owner();
  console.log("\nFactory owner:", owner);
  
  // Get the factory's owner's code (to check if it's a contract)
  const ownerCode = await ethers.provider.getCode(owner);
  console.log("\nOwner code length:", ownerCode.length);
  console.log("Is owner a contract?", ownerCode.length > 2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 