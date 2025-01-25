import { ethers, upgrades, run } from "hardhat";

async function main() {
  console.log("Deploying TokenV1...");

  const TokenV1 = await ethers.getContractFactory("TokenV1");
  
  // Deploy as upgradeable
  const token = await upgrades.deployProxy(TokenV1, [
    "Test Token",     // name
    "TEST",          // symbol
    ethers.parseEther("1000000")  // 1 million tokens initial supply
  ], {
    kind: 'uups',
    initializer: 'initialize',
  });

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("TokenV1 deployed to:", address);
  
  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("Implementation address:", implementationAddress);
  
  // Get admin address
  const adminAddress = await upgrades.erc1967.getAdminAddress(address);
  console.log("Admin address:", adminAddress);

  // Verify contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Error verifying contract:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 