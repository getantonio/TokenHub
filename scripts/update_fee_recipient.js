const { ethers } = require("hardhat");

const CONTRACTS = {
  sepolia: {
    TokenFactory_v3_Updated: "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB",
  },
  opSepolia: {
    TokenFactory_v3_Updated: "0x6b973581595ce8C57f03Bc2384c20f233d45E2D6",
  },
  arbitrumSepolia: {
    TokenFactory_v3_Updated: "0xCBa48f15BecdAC1eAF709Ce65c8FEFe436513e07",
  },
  polygonAmoy: {
    TokenFactory_v3_Updated: "0xc9dE01F826649bbB1A54d2A00Ce91D046791AdE1",
  },
  bscTestnet: {
    TokenFactory_v3_Updated: "0xFf86c158F0cD14b1a2d18AEf8038527f71c4383b",
  }
};

const NEW_OWNER = "0x10C8c279c6b381156733ec160A89Abb260bfcf0C";

async function transferOwnership() {
  // Get the network from Hardhat
  const networkName = hre.network.name;
  console.log(`\nProcessing network: ${networkName}`);
  
  const contracts = CONTRACTS[networkName];
  if (!contracts) {
    console.error(`No contracts found for network: ${networkName}`);
    return;
  }
  
  for (const [name, address] of Object.entries(contracts)) {
    try {
      console.log(`\nTransferring ownership for ${name} at ${address}`);
      
      // Get the contract instance
      const factory = await ethers.getContractAt("TokenFactory_v3_Updated", address);
      
      // Get current owner
      const currentOwner = await factory.owner();
      console.log(`Current owner: ${currentOwner}`);
      
      if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
        console.log(`${name} is already owned by ${NEW_OWNER}`);
        continue;
      }
      
      // Transfer ownership
      const tx = await factory.transferOwnership(NEW_OWNER);
      await tx.wait();
      
      // Verify new owner
      const newOwner = await factory.owner();
      console.log(`New owner: ${newOwner}`);
      
      if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
        console.log(`Successfully transferred ownership of ${name}`);
      } else {
        console.error(`Failed to verify new owner for ${name}`);
      }
    } catch (error) {
      console.error(`Error processing ${name}:`, error.message);
    }
  }
}

transferOwnership()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 