const { ethers } = require("hardhat");

async function main() {
  // This will be the address of your newly deployed fixed factory
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3_FIXED;
  
  if (!FACTORY_ADDRESS) {
    console.error("Please deploy the fixed factory first and set the NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3_FIXED environment variable");
    return;
  }
  
  console.log("Testing token deployment on Polygon Amoy with fixed factory at:", FACTORY_ADDRESS);
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
  
  // Attach to the deployed contract
  const factory = await TokenFactory.attach(FACTORY_ADDRESS);
  
  // Get the signer's address
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using deployer address:", deployerAddress);
  
  // Read the deployment fee
  const deploymentFee = await factory.deploymentFee();
  console.log("Current deployment fee:", ethers.utils.formatEther(deploymentFee), "MATIC");
  
  // Set up token parameters with smaller values
  const tokenParams = {
    name: "Amoy Simple Test Token",
    symbol: "ASTEST",
    // Use smaller supply values for testing on Amoy
    initialSupply: ethers.utils.parseUnits("1000", 18), // Only 1,000 tokens
    maxSupply: ethers.utils.parseUnits("10000", 18), // Max 10,000 tokens
    owner: deployerAddress,
    enableBlacklist: false, // Simplify features
    enableTimeLock: false, // Simplify features
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0,
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 0, // No liquidity for test
    liquidityLockDuration: 0,
    walletAllocations: [
      // Explicitly set one allocation to the deployer
      {
        wallet: deployerAddress,
        percentage: 100, // 100% to owner
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  console.log("Creating token with simplified parameters:");
  console.log("- Name:", tokenParams.name);
  console.log("- Symbol:", tokenParams.symbol);
  console.log("- Initial Supply:", ethers.utils.formatUnits(tokenParams.initialSupply, 18));
  console.log("- Max Supply:", ethers.utils.formatUnits(tokenParams.maxSupply, 18));
  console.log("- 100% allocation to owner (no vesting)");
  
  // Create the token with extra gas
  const createOptions = {
    value: deploymentFee,
    gasLimit: 3000000 // Lower gas limit for Polygon Amoy
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