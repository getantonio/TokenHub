import { execSync } from "child_process";

async function main() {
  console.log('Starting local testnet...');
  
  try {
    // Start hardhat node
    console.log('Starting Hardhat node...');
    execSync('npx hardhat node', { 
      stdio: 'inherit'
    });

  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 