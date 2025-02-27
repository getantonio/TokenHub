const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Basic ERC20 ABI with ownership and minting functions
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) returns (bool)",
  "function burn(uint256 amount) returns (bool)",
  "function liquidityWallet() view returns (address)",
  "function getLiquidityInfo() view returns (tuple(uint256 amount, bool locked, uint256 unlockTime))",
  "function withdrawLiquidity(uint256 amount) returns (bool)"
];

async function main() {
  if (process.argv.length < 3) {
    console.error("Please provide a token address");
    process.exit(1);
  }

  const tokenAddress = process.argv[2].toLowerCase();
  
  try {
    // Connect to the network
    console.log("Connecting to Sepolia network...");
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
    
    // Create token contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
    
    // Get basic token info
    const [name, symbol, decimals, totalSupply, ownerAddress] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner().catch(() => "No owner function")
    ]);

    console.log("\nToken Information:");
    console.log("=================");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Owner: ${ownerAddress}`);

    // Try to get liquidity info
    try {
      const liquidityWallet = await token.liquidityWallet();
      console.log(`\nLiquidity Wallet: ${liquidityWallet}`);
      
      const liquidityInfo = await token.getLiquidityInfo();
      console.log("\nLiquidity Information:");
      console.log("=====================");
      console.log(`Amount: ${ethers.formatUnits(liquidityInfo.amount, decimals)} ${symbol}`);
      console.log(`Locked: ${liquidityInfo.locked}`);
      if (liquidityInfo.unlockTime > 0) {
        console.log(`Unlock Time: ${new Date(liquidityInfo.unlockTime * 1000).toLocaleString()}`);
      }
    } catch (error) {
      console.log("\nNo liquidity functions found");
    }

    // Show available actions
    console.log("\nTo interact with this token (if you're the owner):");
    console.log("=============================================");
    console.log("1. Connect your wallet in MetaMask");
    console.log("2. Make sure you're using the owner address");
    console.log("3. Available functions if you're the owner:");
    console.log("   - Mint new tokens");
    console.log("   - Withdraw liquidity (if unlocked)");
    console.log("   - Burn tokens");
    
    console.log("\nTo check if you're the owner, compare your address with:");
    console.log(`Owner address: ${ownerAddress}`);

  } catch (err) {
    console.error("\n❌ Error occurred:");
    if (err.reason) console.error("Reason:", err.reason);
    if (err.code) console.error("Code:", err.code);
    console.error("\nFull error:", err);
  }
}

main(); 