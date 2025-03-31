// Simple check script to verify Sepolia connection
const { ethers } = require("hardhat");

async function main() {
  console.log("Connecting to Sepolia...");
  
  try {
    // Get all available signers
    const signers = await ethers.getSigners();
    console.log(`Found ${signers.length} signers`);
    
    if (signers.length > 0) {
      const deployer = signers[0];
      console.log(`Deployer address: ${deployer.address}`);
      
      // Get the deployer's balance
      const balance = await ethers.provider.getBalance(deployer.address);
      console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
      
      // Get the chain ID
      const network = await ethers.provider.getNetwork();
      const chainId = network.chainId;
      console.log(`Connected to chain ID: ${chainId}`);
      console.log(`Expected Sepolia chain ID: 11155111`);
      
      if (chainId === 11155111n) {
        console.log("✅ Successfully connected to Sepolia network!");
      } else {
        console.log(`❌ Not connected to Sepolia network. Connected to chain ID ${chainId}. Please check your configuration.`);
      }
    } else {
      console.log("No signers found. Check your private key in .env");
    }
  } catch (error) {
    console.error("Error connecting to network:");
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 