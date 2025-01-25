import { ethers, upgrades, run } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Please set PROXY_ADDRESS in your .env file");
  }

  console.log("Upgrading TokenV1...");

  const TokenV2 = await ethers.getContractFactory("TokenV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, TokenV2);

  await upgraded.waitForDeployment();
  const address = await upgraded.getAddress();
  
  console.log("Token upgraded at:", address);

  // Get new implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("New implementation address:", implementationAddress);

  // Verify new implementation on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying new implementation on Etherscan...");
    try {
      await run("verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("New implementation verified on Etherscan");
    } catch (error) {
      console.log("Error verifying contract:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 