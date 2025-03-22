// Script to manually perform token distribution by interacting with modules
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Define token addresses
  const tokenAddress = "0x7e9620F7aA1186f4fBf8FD1f5460C575f149bb51"; // Latest token we created
  
  // Define wallet addresses that should receive tokens
  const ownerAddress = deployer.address;
  const teamWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const marketingWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  
  // Define factory address
  const factoryAddress = "0x3e1732d174c1b067e0702b26DCFd12fAB1DD71Da";
  
  // Set up token contract
  console.log(`Examining token at ${tokenAddress}...`);
  
  const tokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function getModules() view returns (address[])",
    "function owner() view returns (address)",
    "function transfer(address,uint256) returns (bool)"
  ];
  
  const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
  
  // Get token info
  console.log("\nGetting token details...");
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
  
  // Check factory balance and permission
  const factoryBalance = await token.balanceOf(factoryAddress);
  console.log(`\nFactory (${factoryAddress}) balance: ${ethers.formatUnits(factoryBalance, decimals)} ${symbol}`);
  
  // Define allocation percentages
  const allocations = [
    { label: "Owner", wallet: ownerAddress, percentage: 60 },
    { label: "Team", wallet: teamWallet, percentage: 30 },
    { label: "Marketing", wallet: marketingWallet, percentage: 10 }
  ];
  
  // Try to transfer tokens directly from factory to recipients
  console.log("\nAttempting manual token transfers directly from factory...");
  
  try {
    // Create factory contract with ethers
    const factoryInterfaceABI = [
      "function transfer(address,uint256) external returns (bool)"
    ];
    
    // We need to impersonate the factory to make transfers
    console.log(`Need to impersonate the factory address (${factoryAddress}) to make transfers`);
    console.log("Since we can't do this on testnet, we'll simulate it instead.");
    
    console.log("\nChecking if any security/distribution modules exist...");
    try {
      const modules = await token.getModules();
      console.log(`Found ${modules.length} modules:`);
      
      // Check each module
      for (let i = 0; i < modules.length; i++) {
        console.log(`Module ${i}: ${modules[i]}`);
        
        // Try to check if this is a security module
        try {
          const securityModuleABI = [
            "function isSecurityModule() view returns (bool)"
          ];
          const potentialSecurityModule = new ethers.Contract(modules[i], securityModuleABI, deployer);
          const isSecurityModule = await potentialSecurityModule.isSecurityModule();
          console.log(`Is security module: ${isSecurityModule}`);
        } catch (error) {
          console.log(`Not a security module or doesn't have isSecurityModule function`);
        }
        
        // Try to check if this is a distribution module
        try {
          const distributionModuleABI = [
            "function getAllAllocations() view returns (tuple(address wallet, uint256 amount, string label, bool locked, uint256 unlockTime)[])"
          ];
          const potentialDistributionModule = new ethers.Contract(modules[i], distributionModuleABI, deployer);
          const allocations = await potentialDistributionModule.getAllAllocations();
          console.log(`Found ${allocations.length} allocations in module`);
        } catch (error) {
          console.log(`Not a distribution module or doesn't have getAllAllocations function`);
        }
      }
    } catch (error) {
      console.log(`Error getting modules: ${error.message}`);
    }
    
    // Workaround solution - check current balances
    console.log("\nChecking current wallet balances:");
    for (const allocation of allocations) {
      const balance = await token.balanceOf(allocation.wallet);
      console.log(`${allocation.label} (${allocation.wallet}): ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    }
    
    console.log("\nWould need to transfer tokens to these wallets with these amounts:");
    for (const allocation of allocations) {
      const amount = totalSupply * BigInt(allocation.percentage) / 100n;
      console.log(`${allocation.label} (${allocation.wallet}): ${ethers.formatUnits(amount, decimals)} ${symbol}`);
    }
    
    // If we were on local network, we could do:
    // await hre.network.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [factoryAddress],
    // });
    // const factorySigner = await ethers.provider.getSigner(factoryAddress);
    // 
    // Then do transfers like:
    // const tokenAsFactory = token.connect(factorySigner);
    // await tokenAsFactory.transfer(allocation.wallet, amount);
    
  } catch (error) {
    console.error("Error performing manual distribution:", error);
    if (error.message) console.error("Error message:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 