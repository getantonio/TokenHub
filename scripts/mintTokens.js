const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Extended ABI with more functions to help debug
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) returns (bool)",
  "function paused() view returns (bool)",
  "function blacklisted(address) view returns (bool)",
  "function timeLocked(address) view returns (bool)",
  "function maxSupply() view returns (uint256)"
];

async function main() {
  if (process.argv.length < 4) {
    console.error("Usage: node mintTokens.js <token-address> <amount>");
    process.exit(1);
  }

  const tokenAddress = process.argv[2].toLowerCase();
  const amount = process.argv[3];
  
  try {
    // Connect to the network
    console.log("Connecting to Sepolia network...");
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const userAddress = await wallet.getAddress();
    
    console.log(`Connected with address: ${userAddress}`);

    // Create token contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
    
    // Get token info
    const [name, symbol, decimals, totalSupply, owner, maxSupply, isPaused] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner(),
      token.maxSupply().catch(() => "No max supply"),
      token.paused().catch(() => false)
    ]);

    console.log("\nToken Information:");
    console.log("=================");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Max Supply: ${maxSupply === "No max supply" ? maxSupply : ethers.formatUnits(maxSupply, decimals)} ${symbol}`);
    console.log(`Owner: ${owner}`);
    console.log(`Your Address: ${userAddress}`);
    console.log(`Paused: ${isPaused}`);

    // Check if user is owner
    const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
    console.log(`\nOwnership Status: ${isOwner ? "You are the owner ✓" : "You are not the owner ✗"}`);

    if (!isOwner) {
      throw new Error("You must be the owner to mint tokens");
    }

    // Convert amount to proper units
    const amountInWei = ethers.parseUnits(amount, decimals);

    // Check if minting would exceed max supply
    if (maxSupply !== "No max supply") {
      const newTotalSupply = totalSupply + amountInWei;
      if (newTotalSupply > maxSupply) {
        throw new Error(`Minting ${amount} tokens would exceed max supply of ${ethers.formatUnits(maxSupply, decimals)}`);
      }
    }

    // Try to mint
    console.log(`\nAttempting to mint ${amount} ${symbol} tokens to ${userAddress}...`);
    
    // Estimate gas first
    const gasEstimate = await token.mint.estimateGas(userAddress, amountInWei)
      .catch(err => {
        throw new Error(`Gas estimation failed: ${err.message}`);
      });
    
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
    
    // Add 20% buffer to gas estimate
    const gasLimit = gasEstimate + (gasEstimate / BigInt(5));
    
    // Send transaction with gas limit
    const mintTx = await token.mint(userAddress, amountInWei, {
      gasLimit
    });
    
    console.log(`Transaction hash: ${mintTx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    const receipt = await mintTx.wait();
    console.log(`\n✓ Successfully minted ${amount} ${symbol} tokens!`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Verify the new balance
    const newBalance = await token.balanceOf(userAddress);
    console.log(`\nNew balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);

  } catch (err) {
    console.error("\n❌ Error occurred:");
    if (err.reason) console.error("Reason:", err.reason);
    if (err.code) console.error("Code:", err.code);
    console.error("\nFull error:", err);
    process.exit(1);
  }
}

main(); 