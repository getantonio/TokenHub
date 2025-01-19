import { ethers } from "hardhat";
import { execSync } from "child_process";

async function main() {
  console.log('Starting local testnet...');
  
  try {
    // Start hardhat node in background
    console.log('Starting Hardhat node...');
    const hardhatNode = execSync('npx hardhat node', { 
      stdio: 'inherit',
      killSignal: 'SIGINT' // Allow proper cleanup on exit
    });

    // Wait for node to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('Shutting down local testnet...');
      process.exit(0);
    });

    // Keep script running
    await new Promise(() => {});

  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 