// Test script for token creation with V5 factory (fixed distribution)
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Testing V5 factory distribution with account:", deployer.address);
  
  // Check network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Testing on network with chainId: ${chainId}`);
  
  // Define wallet addresses for testing
  const ownerAddress = deployer.address; // Token owner
  const teamWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example team wallet
  const marketingWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Example marketing wallet
  
  // Define factory address - change after deploying V5 factory
  const factoryAddress = "0xe063C5263243286a8B20159f2C73132A136c354A"; // Replace with V5 factory address
  
  // Get factory contract instance
  console.log(`Connecting to factory at ${factoryAddress}...`);
  
  // Get contract factory for the token factory
  const factoryABI = [
    "function createTokenWithDistribution(string, string, uint256, address, bool, tuple(address wallet, uint256 percentage, string label, bool vesting, uint256 vestingDuration, uint256 cliffDuration)[]) external returns (address)",
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Define token parameters
  const tokenName = "Test Distribution V5 Token";
  const tokenSymbol = "TDTV5";
  const initialSupply = ethers.utils.parseEther("1000000"); // 1 million tokens
  const includeDistribution = true;
  
  // Define wallet allocations with proper structure
  // Each allocation includes:
  // - wallet address
  // - percentage (out of 100)
  // - label
  // - vesting (boolean)
  // - vestingDuration (days)
  // - cliffDuration (days)
  const walletAllocations = [
    {
      wallet: ownerAddress,
      percentage: 60, // 60% to owner
      label: "Owner",
      vesting: false,
      vestingDuration: 0,
      cliffDuration: 0
    },
    {
      wallet: teamWallet,
      percentage: 30, // 30% to team
      label: "Team",
      vesting: false,
      vestingDuration: 0,
      cliffDuration: 0
    },
    {
      wallet: marketingWallet,
      percentage: 10, // 10% to marketing
      label: "Marketing",
      vesting: false,
      vestingDuration: 0,
      cliffDuration: 0
    }
  ];
  
  console.log("Creating token with the following allocations:");
  walletAllocations.forEach(allocation => {
    console.log(`${allocation.label}: ${allocation.wallet} - ${allocation.percentage}%`);
  });
  
  console.log("\nSending transaction to create token...");
  
  try {
    // Create token with custom distribution
    const tx = await factory.createTokenWithDistribution(
      tokenName,
      tokenSymbol,
      initialSupply,
      ownerAddress,
      includeDistribution,
      walletAllocations
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block", receipt.blockNumber);
    
    // Get token address from logs
    // Parse logs to find the token address (depends on the event format)
    let tokenAddress;
    for (const log of receipt.logs) {
      // Look for TokenCreated event
      // This is approximate as we don't have the exact event signature
      if (log.topics && log.topics.length > 0 && log.topics[0].indexOf('TokenCreated') > -1) {
        tokenAddress = '0x' + log.topics[1].substring(26);
        break;
      }
    }
    
    if (!tokenAddress) {
      // Fallback method to get created token (may vary depending on the factory implementation)
      const events = receipt.events.filter(e => e.event === 'TokenCreated');
      if (events.length > 0) {
        tokenAddress = events[0].args.token;
      }
    }
    
    console.log("Token created successfully!");
    console.log("Token address:", tokenAddress);
    console.log("\nCheck token holders on Amoy Polygonscan:");
    console.log(`https://www.oklink.com/amoy/token/${tokenAddress}/#holders`);
    
    // Setup for token balances check
    const tokenABI = [
      "function balanceOf(address) view returns (uint256)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function totalSupply() view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    // Create token instance
    const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
    
    // Get token info
    console.log("\nChecking token allocations...");
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const decimals = await token.decimals();
    
    console.log(`\nToken Details:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    
    // Check balances
    console.log("\nChecking balances:");
    for (const allocation of walletAllocations) {
      const balance = await token.balanceOf(allocation.wallet);
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      const expectedAmount = ethers.utils.formatUnits(
        totalSupply.mul(allocation.percentage).div(100),
        decimals
      );
      console.log(`${allocation.label} (${allocation.wallet}): ${formattedBalance} ${symbol}`);
      console.log(`Expected: ${expectedAmount} ${symbol} (${allocation.percentage}%)`);
      
      // Check if balance matches expected
      const actualPercentage = balance.mul(100).div(totalSupply);
      console.log(`Actual percentage: ${actualPercentage}%`);
      console.log(`Matches expected: ${actualPercentage.toString() === allocation.percentage.toString() ? 'Yes ✅' : 'No ❌'}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error("Error creating token:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 