const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TokenFactory_v2_DirectDEX_Fixed to Sepolia with corrected router address...");

  // Listing fee (0.001 ETH)
  const listingFee = ethers.parseEther("0.001");
  
  // Deploy the factory contract
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
  const factory = await TokenFactory.deploy(listingFee);
  
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log(`TokenFactory_v2_DirectDEX_Fixed deployed to: ${factoryAddress}`);
  
  // Verify the router address is correct
  console.log("Checking defaultRouter configuration...");
  const router = await factory.defaultRouter();
  console.log(`Router address set to: ${router}`);
  
  const version = await factory.VERSION();
  console.log(`Contract version: ${version}`);
  
  const fee = await factory.listingFee();
  console.log(`Listing fee: ${ethers.formatEther(fee)} ETH`);
  
  console.log("\nUpdate your .env file with:");
  console.log(`NEXT_PUBLIC_SEPOLIA_V2_DIRECTDEX_FIXED_ADDRESS=${factoryAddress}`);
  
  console.log("\nAfter deployment, verify contract on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${factoryAddress} ${listingFee}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 