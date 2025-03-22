// Test script for token creation with V6 factory (with fixed distribution)
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Testing V6 factory distribution with account:", deployer.address);
  
  // Check network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Testing on network with chainId: ${chainId}`);
  
  // Define wallet addresses for testing
  const ownerAddress = deployer.address; // Token owner
  const teamWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example team wallet
  const marketingWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Example marketing wallet
  
  // Address of the deployed V6 factory
  const factoryAddress = "0xe175397FA8D3494Ad5986cb2A2C5622AD473fB3B"; 
  
  console.log(`Connecting to V6 factory at ${factoryAddress}...`);
  
  // Get contract factory for the token factory
  const factoryABI = [
    "function createTokenWithDistribution(string,string,uint256,address,bool,(address,uint256,string,bool,uint256,uint256)[]) external returns (address)",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
    "event DeploymentInfo(string message, address indexed target)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Define token parameters
  const tokenName = "Test Distribution V6 Fixed Token";
  const tokenSymbol = "TDTV6";
  const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens
  const includeDistribution = true;
  
  // Define wallet allocations as arrays to match the contract's expected format
  const walletAllocations = [
    [ownerAddress, 60, "Owner", false, 0, 0],
    [teamWallet, 30, "Team", false, 0, 0],
    [marketingWallet, 10, "Marketing", false, 0, 0]
  ];
  
  // Create simplified allocations for logging
  const allocations = [
    { label: "Owner", wallet: ownerAddress, percentage: 60 },
    { label: "Team", wallet: teamWallet, percentage: 30 },
    { label: "Marketing", wallet: marketingWallet, percentage: 10 },
  ];
  
  console.log("Creating token with the following allocations:");
  allocations.forEach(allocation => {
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
    
    // Parse logs to find relevant events
    console.log("\nParsing transaction logs...");
    
    let tokenAddress;
    let deploymentInfoEvents = [];
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = factory.interface.parseLog(log);
        
        if (parsedLog && parsedLog.name === 'TokenCreated') {
          tokenAddress = parsedLog.args.tokenAddress;
          console.log(`Token created at: ${tokenAddress}`);
        }
        
        if (parsedLog && parsedLog.name === 'DeploymentInfo') {
          deploymentInfoEvents.push({
            message: parsedLog.args.message,
            target: parsedLog.args.target
          });
        }
      } catch (error) {
        // Not a log we can parse, skip it
      }
    }
    
    if (tokenAddress) {
      console.log("\nToken created successfully!");
      console.log("Token address:", tokenAddress);
      
      // Display deployment info events
      if (deploymentInfoEvents.length > 0) {
        console.log("\nDeployment events:");
        deploymentInfoEvents.forEach((event, i) => {
          console.log(`${i + 1}. ${event.message} - Target: ${event.target}`);
        });
      }
      
      console.log("\nCheck token holders on Amoy Polygonscan:");
      console.log(`https://www.oklink.com/amoy/token/${tokenAddress}/#holders`);
      
      // Setup for token balances check
      const tokenABI = [
        "function balanceOf(address) view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function getModules() view returns (address[])",
        "function owner() view returns (address)"
      ];
      
      // Create token instance
      const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
      
      // Get token info
      console.log("\nChecking token details and allocations...");
      const name = await token.name();
      const symbol = await token.symbol();
      const totalSupply = await token.totalSupply();
      const decimals = await token.decimals();
      const tokenOwner = await token.owner();
      
      console.log(`Token Name: ${name}`);
      console.log(`Token Symbol: ${symbol}`);
      console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      console.log(`Decimals: ${decimals}`);
      console.log(`Token Owner: ${tokenOwner}`);
      
      // Check balances for each allocation
      console.log("\nVerifying wallet balances...");
      for (const allocation of allocations) {
        const balance = await token.balanceOf(allocation.wallet);
        const formattedBalance = ethers.formatUnits(balance, decimals);
        const expectedBalance = ethers.formatUnits(totalSupply * BigInt(allocation.percentage) / 100n, decimals);
        const actualPercentage = (balance * 100n) / totalSupply;
        const matchesExpected = balance.toString() === (totalSupply * BigInt(allocation.percentage) / 100n).toString();
        
        console.log(`${allocation.label} (${allocation.wallet}): ${formattedBalance} ${symbol}`);
        console.log(`  Expected: ${expectedBalance} ${symbol}`);
        console.log(`  Actual percentage: ${actualPercentage}%`);
        console.log(`  Matches expected: ${matchesExpected ? "Yes ✅" : "No ❌"}`);
      }
      
      // Try to get modules
      console.log("\nChecking token modules...");
      try {
        const modules = await token.getModules();
        console.log(`Found ${modules.length} modules:`);
        
        // Check each module for balance
        for (let i = 0; i < modules.length; i++) {
          const moduleAddress = modules[i];
          const moduleBalance = await token.balanceOf(moduleAddress);
          console.log(`Module ${i} (${moduleAddress}): ${ethers.formatUnits(moduleBalance, decimals)} ${symbol}`);
          
          // If this module has a balance, investigate further
          if (moduleBalance > 0n) {
            console.log(`  This module holds tokens - checking type`);
            
            // Try to check module type
            try {
              const moduleTypeABI = ["function getModuleType() pure returns (bytes32)"];
              const moduleContract = new ethers.Contract(moduleAddress, moduleTypeABI, deployer);
              const moduleType = await moduleContract.getModuleType();
              console.log(`  Module type: ${moduleType}`);
            } catch (error) {
              console.log(`  Could not determine module type: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`Could not get modules: ${error.message}`);
      }
      
      // Check factory balance
      const factoryBalance = await token.balanceOf(factoryAddress);
      console.log(`\nFactory (${factoryAddress}) balance: ${ethers.formatUnits(factoryBalance, decimals)} ${symbol}`);
      
      // Check if factory is holding any tokens
      if (factoryBalance > 0n) {
        const factoryPercentage = (factoryBalance * 100n) / totalSupply;
        console.log(`Factory holds ${factoryPercentage}% of tokens - This is unexpected!`);
      } else {
        console.log(`Factory holds 0% of tokens - This is good, indicates proper distribution!`);
      }
      
      console.log("\nDistribution test complete!");
    } else {
      console.log("Could not find token address in logs - deployment may have failed");
    }
  } catch (error) {
    console.error("Error creating token:", error);
    if (error.message) console.error("Error message:", error.message);
    if (error.data) console.error("Error data:", error.data);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 