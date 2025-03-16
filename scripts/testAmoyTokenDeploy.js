const { ethers } = require("hardhat");

async function main() {
  // Replace with your actual deployed factory address on Polygon Amoy
  const FACTORY_ADDRESS = "REPLACE_WITH_DEPLOYED_FACTORY_ADDRESS"; // Replace after deployment
  
  console.log("Testing token deployment on Polygon Amoy with factory at:", FACTORY_ADDRESS);
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  
  // Attach to the deployed contract
  const factory = await TokenFactory.attach(FACTORY_ADDRESS);
  
  // Get the signer's address
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using deployer address:", deployerAddress);
  
  // Read the deployment fee
  const deploymentFee = await factory.deploymentFee();
  console.log("Current deployment fee:", ethers.utils.formatEther(deploymentFee), "MATIC");
  
  // Set up token parameters - intentionally omit wallet allocations
  // The factory should default to allocating to the owner
  const tokenParams = {
    name: "Amoy Test Token",
    symbol: "ATEST",
    initialSupply: ethers.utils.parseUnits("1000000", 18),
    maxSupply: ethers.utils.parseUnits("2000000", 18),
    owner: deployerAddress,
    enableBlacklist: true,
    enableTimeLock: true,
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0,
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 10,
    liquidityLockDuration: 30 * 24 * 60 * 60, // 30 days
    walletAllocations: [], // Empty array - factory should handle this
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  console.log("Creating token with parameters:");
  console.log("- Name:", tokenParams.name);
  console.log("- Symbol:", tokenParams.symbol);
  console.log("- Initial Supply:", ethers.utils.formatUnits(tokenParams.initialSupply, 18));
  console.log("- Max Supply:", ethers.utils.formatUnits(tokenParams.maxSupply, 18));
  console.log("- Wallet Allocations: Empty (factory will allocate to owner)");
  
  // Create the token with extra gas
  const createOptions = {
    value: deploymentFee,
    gasLimit: 5000000 // Increase gas limit for Polygon Amoy
  };
  
  console.log("Sending token creation transaction...");
  try {
    const tx = await factory.createToken(tokenParams, createOptions);
    console.log("Transaction sent:", tx.hash);
    
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Find the created token address from event logs
    const tokenCreatedEvent = receipt.events.find(event => event.event === 'TokenCreated');
    if (tokenCreatedEvent) {
      const tokenAddress = tokenCreatedEvent.args.tokenAddress;
      console.log("✅ Success! New token created at address:", tokenAddress);
      console.log("Test the token by adding it to Metamask with address:", tokenAddress);
    } else {
      console.log("❌ Token creation event not found in logs, but transaction succeeded");
    }
  } catch (error) {
    console.error("❌ Error creating token:", error);
    
    // Try to extract more useful error information
    if (error.error && error.error.message) {
      console.error("Error message:", error.error.message);
    }
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 