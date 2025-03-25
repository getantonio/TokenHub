const { ethers } = require("hardhat");

// Basic factory interface - minimal ABI with just the main functions
const factoryABI = [
  "function deploymentFee() view returns (uint256)",
  "function paused() view returns (bool)",
  "function totalTokensCreated() view returns (uint256)",
  "function owner() view returns (address)",
  "function routerAddress() view returns (address)",
  "function pause() external",
  "function unpause() external",
  "function createToken(tuple(string name, string symbol, uint256 initialSupply, uint256 maxSupply, address owner, bool enableBlacklist, bool enableTimeLock, uint256 presaleRate, uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presalePercentage, uint256 liquidityPercentage, uint256 liquidityLockDuration, tuple(address wallet, uint256 percentage, bool vestingEnabled, uint256 vestingDuration, uint256 cliffDuration, uint256 vestingStartTime)[] walletAllocations, uint256 maxActivePresales, bool presaleEnabled) params) external payable returns (address)"
];

async function main() {
  // Get the address from environment or hardcode
  const factoryAddress = "0x07660e3b490E74a286927C7eF7219192003cFee2"; // V1 factory
  
  console.log("Analyzing V1 factory at:", factoryAddress);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using account:", deployerAddress);
  
  // Check if the contract exists
  const code = await ethers.provider.getCode(factoryAddress);
  if (code === '0x') {
    console.error("❌ No contract found at this address");
    return;
  }
  
  console.log("✅ Contract code found at this address (bytecode size:", code.length, "bytes)");
  
  // Connect to the factory
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Try different view methods with try/catch to see which ones work
  console.log("\nTesting contract interface:");
  
  try {
    const fee = await factory.deploymentFee();
    console.log("✅ deploymentFee() succeeds:", ethers.formatEther(fee), "MATIC");
  } catch (error) {
    console.log("❌ deploymentFee() fails:", error.message);
  }
  
  try {
    const isPaused = await factory.paused();
    console.log("✅ paused() succeeds:", isPaused);
  } catch (error) {
    console.log("❌ paused() fails:", error.message);
  }
  
  try {
    const totalTokens = await factory.totalTokensCreated();
    console.log("✅ totalTokensCreated() succeeds:", totalTokens.toString());
  } catch (error) {
    console.log("❌ totalTokensCreated() fails:", error.message);
  }
  
  try {
    const ownerAddress = await factory.owner();
    console.log("✅ owner() succeeds:", ownerAddress);
  } catch (error) {
    console.log("❌ owner() fails:", error.message);
  }
  
  try {
    const router = await factory.routerAddress();
    console.log("✅ routerAddress() succeeds:", router);
  } catch (error) {
    console.log("❌ routerAddress() fails:", error.message);
  }
  
  // Try to create a minimal test token with very basic parameters
  console.log("\nTrying to create a minimal test token...");
  
  // Minimum viable token parameters
  const minTokenParams = {
    name: "Test Token",
    symbol: "TEST",
    initialSupply: ethers.parseUnits("100", 18), // Just 100 tokens
    maxSupply: ethers.parseUnits("1000", 18),
    owner: deployerAddress,
    enableBlacklist: false,
    enableTimeLock: false,
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0, 
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 0,
    liquidityLockDuration: 0,
    walletAllocations: [
      {
        wallet: deployerAddress,
        percentage: 100,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  try {
    // Try to get the fee first
    let fee;
    try {
      fee = await factory.deploymentFee();
      console.log("Using deployment fee:", ethers.formatEther(fee), "MATIC");
    } catch (error) {
      // Default to 0.05 MATIC if fee can't be retrieved
      fee = ethers.parseEther("0.05");
      console.log("Using default fee:", ethers.formatEther(fee), "MATIC");
    }
    
    // Create token with gas limit and fee
    const tx = await factory.createToken(minTokenParams, {
      value: fee,
      gasLimit: 3000000
    });
    
    console.log("Token creation transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Look for token creation event
    // Note: This is a simple approach - actual event parsing would need the exact event signature
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("✅ Token creation successful, found", receipt.logs.length, "logs");
      // The token address is likely in one of the logs, but we'd need the exact ABI to parse it
    } else {
      console.log("⚠️ Transaction succeeded but no logs found");
    }
    
  } catch (error) {
    console.error("❌ Token creation failed:", error.message);
    
    if (error.error) {
      console.error("Error data:", error.error);
    }
    
    if (error.transaction) {
      console.log("Failed transaction:", error.transaction);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 