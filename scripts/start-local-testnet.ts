import { ethers } from "hardhat";
import { execSync } from "child_process";

async function main() {
  console.log('Starting local testnet...');
  
  // Start hardhat node in background
  const hardhatNode = execSync('npx hardhat node', { stdio: 'inherit' });

  try {
    console.log('Deploying contracts...');
    
    // Deploy TokenFactory
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(ethers.parseEther("0.1"));
    await tokenFactory.deployed();
    
    console.log(`TokenFactory deployed to: ${tokenFactory.address}`);

    // Fund test accounts
    const [deployer, ...testAccounts] = await ethers.getSigners();
    
    for (const account of testAccounts) {
      await deployer.sendTransaction({
        to: account.address,
        value: ethers.parseEther("100.0")
      });
      console.log(`Funded ${account.address} with 100 ETH`);
    }

  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

main().catch(console.error); 