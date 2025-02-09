const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Getting template address with account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x61bd5538a41E42B6EDd88b71f056521Aa4b27671"; // TokenFactory_v3 address
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(factoryAddress);

  try {
    // Get template address
    const templateAddress = await factory.implementation();
    console.log("Template address:", templateAddress);
  } catch (error) {
    console.error("Error getting template address:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 