const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Basic ERC20 ABI with minting functions
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) returns (bool)"
];

async function main() {
  if (process.argv.length < 5) {
    console.error("Usage: node mintOrTransferTokens.js <token-address> <to-address> <amount>");
    process.exit(1);
  }

  const tokenAddress = process.argv[2].toLowerCase();
  const toAddress = process.argv[3].toLowerCase();
  const amount = process.argv[4];
  
  try {
    // Connect to the network with signer
    console.log("Connecting to Sepolia network...");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    console.log(`Connected with address: ${userAddress}`);

    // Create token contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
    
    // Get basic token info
    const [name, symbol, decimals, ownerAddress, balance] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.owner().catch(() => "No owner function"),
      token.balanceOf(userAddress)
    ]);

    console.log("\nToken Information:");
    console.log("=================");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Your Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    console.log(`Owner Address: ${ownerAddress}`);
    console.log(`Your Address: ${userAddress}`);

    // Check if user is owner
    const isOwner = ownerAddress.toLowerCase() === userAddress.toLowerCase();
    console.log(`\nOwnership Status: ${isOwner ? "You are the owner ✓" : "You are not the owner ✗"}`);

    // Convert amount to proper units
    const amountInWei = ethers.parseUnits(amount, decimals);

    if (isOwner) {
      // Try to mint first
      try {
        console.log("\nAttempting to mint tokens...");
        const mintTx = await token.mint(toAddress, amountInWei);
        await mintTx.wait();
        console.log(`✓ Successfully minted ${amount} ${symbol} to ${toAddress}`);
        return;
      } catch (error) {
        console.log("Could not mint tokens (contract might not have mint function)");
        console.log("Trying transfer instead...");
      }
    }

    // If minting fails or user is not owner, try transfer
    if (balance >= amountInWei) {
      const transferTx = await token.transfer(toAddress, amountInWei);
      await transferTx.wait();
      console.log(`✓ Successfully transferred ${amount} ${symbol} to ${toAddress}`);
    } else {
      console.error(`❌ Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    }

  } catch (err) {
    console.error("\n❌ Error occurred:");
    if (err.reason) console.error("Reason:", err.reason);
    if (err.code) console.error("Code:", err.code);
    console.error("\nFull error:", err);
  }
}

main(); 