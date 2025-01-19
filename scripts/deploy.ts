import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TokenFactory...");

  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  
  // Deploy with 0.1 ETH creation fee
  const tokenFactory = await TokenFactory.deploy(ethers.parseEther("0.1"));

  await tokenFactory.waitForDeployment();

  const address = await tokenFactory.getAddress();
  console.log(`TokenFactory deployed to: ${address}`);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await tokenFactory.deploymentTransaction()?.wait(5);
  
  console.log("\nDeployment complete! Next steps:");
  console.log("1. Add this address to your .env file as NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS");
  console.log("2. Verify the contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address} ${ethers.parseEther("0.1")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 