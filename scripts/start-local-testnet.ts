import { ethers } from "hardhat";
import { execSync } from "child_process";
import { parseEther } from "ethers";

async function main() {
  // Deploy test contracts
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy(parseEther("0.1"));
  await tokenFactory.waitForDeployment();

  const address = await tokenFactory.getAddress();
  console.log(`TokenFactory deployed to: ${address}`);

  // Fund test accounts
  const accounts = await ethers.getSigners();
  for (const account of accounts.slice(1, 5)) {
    await ethers.provider.send("hardhat_setBalance", [
      account.address,
      "0x56BC75E2D63100000", // 100 ETH
    ]);
  }

  console.log("Test accounts funded");
}

// Start local network
console.log("Starting local testnet...");
execSync("npx hardhat node", { stdio: "inherit" });

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 