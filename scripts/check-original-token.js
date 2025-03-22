const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const tokenAddress = "0xa0d0665a412b222022cf64347f5d5809f8c54dff"; // Original user token
  console.log(`Checking holders for token: ${tokenAddress}`);
  
  // Create a contract instance for the token
  const tokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const token = new ethers.Contract(tokenAddress, tokenABI, ethers.provider);
  
  try {
    // Get token info
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.totalSupply(),
      token.decimals()
    ]);
    
    const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Total Supply: ${formattedTotalSupply} ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    
    // Check the creator's address
    const creatorAddress = "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F"; // From polygonscan
    
    // Get the token's contract
    const tokenContract = await ethers.getContractAt("V4TokenBase", tokenAddress);
    
    // Try to get modules from the token
    let modules = [];
    try {
      modules = await tokenContract.getModules();
      console.log("\nToken Modules:");
      for (let i = 0; i < modules.length; i++) {
        console.log(`- Module ${i+1}: ${modules[i]}`);
      }
    } catch (error) {
      console.log("Could not get modules:", error.message);
    }
    
    console.log("\nChecking balances...");
    
    // Check creator balance
    const creatorBalance = await token.balanceOf(creatorAddress);
    console.log(`Creator (${creatorAddress}): ${ethers.formatUnits(creatorBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(creatorBalance, decimals)) / Number(formattedTotalSupply) * 100).toFixed(2)}%)`);
    
    // Check if there are any tokens not accounted for
    const unaccountedBalance = BigInt(totalSupply) - BigInt(creatorBalance);
    
    if (unaccountedBalance > 0) {
      console.log(`\nUnaccounted balance: ${ethers.formatUnits(unaccountedBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(unaccountedBalance, decimals)) / Number(formattedTotalSupply) * 100).toFixed(2)}%)`);
      
      // If we found modules, check their balances
      if (modules.length > 0) {
        console.log("\nChecking module balances:");
        for (let i = 0; i < modules.length; i++) {
          const moduleAddress = modules[i];
          const moduleBalance = await token.balanceOf(moduleAddress);
          console.log(`- Module ${i+1} (${moduleAddress}): ${ethers.formatUnits(moduleBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(moduleBalance, decimals)) / Number(formattedTotalSupply) * 100).toFixed(2)}%)`);
        }
      }
    }
    
    // Check if the token was created with one of our factories
    const factoryAddresses = [
      "0xe063C5263243286a8B20159f2C73132A136c354A", // V4 with custom distribution
      // Add other factory addresses from .env.local if needed
    ];
    
    console.log("\nChecking factory balances:");
    for (const factoryAddress of factoryAddresses) {
      const factoryBalance = await token.balanceOf(factoryAddress);
      console.log(`Factory (${factoryAddress}): ${ethers.formatUnits(factoryBalance, decimals)} ${symbol} (${(Number(ethers.formatUnits(factoryBalance, decimals)) / Number(formattedTotalSupply) * 100).toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.error("Error checking token:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 