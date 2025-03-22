// Recreation of the 'asian Hottie' (ASIHOT) token using the V6 factory
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Recreating ASIHOT token with V6 factory using account:", deployer.address);
  
  // V6 factory address
  const factoryAddress = "0xe175397FA8D3494Ad5986cb2A2C5622AD473fB3B";
  
  // Get factory contract
  const factoryABI = [
    "function createTokenWithDistribution(string,string,uint256,address,bool,(address,uint256,string,bool,uint256,uint256)[]) external returns (address)",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
    "event DeploymentInfo(string message, address indexed target)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Original token details
  const tokenName = "asian Hottie";
  const tokenSymbol = "ASIHOT";
  const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens
  const includeDistribution = true;
  
  // Define wallet allocations for the new token
  // We'll use our test wallets for demonstration
  const ownerAddress = deployer.address;
  const teamWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const marketingWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  
  // Define wallet allocations as arrays to match the contract's expected format
  const walletAllocations = [
    [ownerAddress, 60, "Owner", false, 0, 0],
    [teamWallet, 30, "Team", false, 0, 0],
    [marketingWallet, 10, "Marketing", false, 0, 0]
  ];
  
  console.log(`Creating token "${tokenName}" (${tokenSymbol}) with the following allocations:`);
  walletAllocations.forEach(allocation => {
    console.log(`- ${allocation[2]}: ${allocation[1]}% to ${allocation[0]}`);
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
    
    // Find the token address from the logs
    let tokenAddress;
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = factory.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'TokenCreated') {
          tokenAddress = parsedLog.args.tokenAddress;
          console.log(`Token created at: ${tokenAddress}`);
          break;
        }
      } catch (error) {
        // Not a log we can parse, skip
      }
    }
    
    if (tokenAddress) {
      console.log(`\nToken '${tokenName}' (${tokenSymbol}) created successfully at ${tokenAddress}`);
      console.log(`View on Amoy PolygonScan: https://www.oklink.com/amoy/token/${tokenAddress}`);
      
      // Create a contract instance for the token to check balances
      const tokenABI = [
        "function balanceOf(address) view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      
      const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
      
      // Get token info
      const [name, symbol, totalSupply, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
        token.decimals()
      ]);
      
      console.log("\nToken Details:");
      console.log(`Name: ${name}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      console.log(`Decimals: ${decimals}`);
      
      // Check wallet balances
      console.log("\nChecking wallet balances:");
      
      // Owner
      const ownerBalance = await token.balanceOf(ownerAddress);
      console.log(`Owner (${ownerAddress}): ${ethers.formatUnits(ownerBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(ownerBalance, decimals)) / Number(ethers.formatUnits(totalSupply, decimals)) * 100).toFixed(2)}%)`);
      
      // Team
      const teamBalance = await token.balanceOf(teamWallet);
      console.log(`Team (${teamWallet}): ${ethers.formatUnits(teamBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(teamBalance, decimals)) / Number(ethers.formatUnits(totalSupply, decimals)) * 100).toFixed(2)}%)`);
      
      // Marketing
      const marketingBalance = await token.balanceOf(marketingWallet);
      console.log(`Marketing (${marketingWallet}): ${ethers.formatUnits(marketingBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(marketingBalance, decimals)) / Number(ethers.formatUnits(totalSupply, decimals)) * 100).toFixed(2)}%)`);
      
      // Factory balance
      const factoryBalance = await token.balanceOf(factoryAddress);
      console.log(`\nFactory (${factoryAddress}): ${ethers.formatUnits(factoryBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(factoryBalance, decimals)) / Number(ethers.formatUnits(totalSupply, decimals)) * 100).toFixed(2)}%)`);
      
      if (factoryBalance > 0) {
        console.log("⚠️ Factory still holds tokens - this is unexpected!");
      } else {
        console.log("✅ Factory has 0 tokens - distribution successful!");
      }
      
      console.log("\nToken recreation completed successfully!");
    } else {
      console.log("Could not find token address in logs - deployment may have failed");
    }
  } catch (error) {
    console.error("Error creating token:", error);
    if (error.message) console.error("Error message:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 