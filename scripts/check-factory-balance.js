// Check the factory and token module balances
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Checking balances with account:", deployer.address);
  
  // Define addresses
  const tokenAddress = "0xe06C1827523FCEe2796902dBE29e36DEdE460f2F"; // From previous test
  const factoryAddress = "0x3e1732d174c1b067e0702b26DCFd12fAB1DD71Da"; // V5 factory address
  
  // Token ABI for balance checks
  const tokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function modules() view returns (address[])"
  ];
  
  // Create token instance
  const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
  
  // Get token info
  console.log("Checking token:", tokenAddress);
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const decimals = await token.decimals();
  
  console.log(`\nToken Details:`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  
  // Check factory balance
  const factoryBalance = await token.balanceOf(factoryAddress);
  console.log(`\nFactory (${factoryAddress}) balance: ${ethers.formatUnits(factoryBalance, decimals)} ${symbol}`);
  const factoryPercentage = (factoryBalance * 100n) / totalSupply;
  console.log(`Factory percentage: ${factoryPercentage}%`);
  
  // Check some example wallets
  const testWallets = [
    { name: "Owner", address: "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F" },
    { name: "Team", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
    { name: "Marketing", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" }
  ];
  
  console.log("\nChecking wallet balances:");
  for (const wallet of testWallets) {
    const balance = await token.balanceOf(wallet.address);
    console.log(`${wallet.name} (${wallet.address}): ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    const percentage = (balance * 100n) / totalSupply;
    console.log(`Percentage: ${percentage}%`);
  }
  
  // Try to get modules
  try {
    console.log("\nChecking for modules...");
    const modules = await token.modules();
    console.log(`Found ${modules.length} modules:`);
    
    // Check each module's balance
    for (let i = 0; i < modules.length; i++) {
      const moduleAddress = modules[i];
      const moduleBalance = await token.balanceOf(moduleAddress);
      console.log(`Module ${i} (${moduleAddress}): ${ethers.formatUnits(moduleBalance, decimals)} ${symbol}`);
      const modulePercentage = (moduleBalance * 100n) / totalSupply;
      console.log(`Percentage: ${modulePercentage}%`);
    }
  } catch (error) {
    console.log("Could not get modules:", error.message);
  }
  
  console.log("\nBalance check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 