const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking nonce for account:", deployer.address);
  
  const nonce = await deployer.getNonce();
  console.log("Current nonce:", nonce);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 