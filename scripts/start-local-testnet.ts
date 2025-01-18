import { ethers } from "hardhat";
import { execSync } from "child_process";
import { parseEther } from "ethers";
import fs from "fs";

async function main() {
  try {
    console.log('Deploying contracts to local testnet...');
    
    // Deploy test contracts
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(parseEther("0.1"));
    await tokenFactory.waitForDeployment();

    const address = await tokenFactory.getAddress();
    console.log(`TokenFactory deployed to: ${address}`);

    // Write address to .env.local
    const envContent = `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS="${address}"\n`;
    fs.writeFileSync('.env.local', envContent, { flag: 'a' });
    console.log('Updated .env.local with contract address');

    // Fund test accounts
    const accounts = await ethers.getSigners();
    for (const account of accounts.slice(1, 5)) {
      await ethers.provider.send("hardhat_setBalance", [
        account.address,
        "0x56BC75E2D63100000", // 100 ETH
      ]);
    }

    console.log('Test accounts funded');
  } catch (error) {
    console.error('Local testnet setup error:', error);
    process.exit(1);
  }
}

// Start local network
console.log("Starting local testnet...");
execSync("npx hardhat node", { stdio: "inherit" });

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 