const { ethers } = require("hardhat");

async function main() {
  // Token contract address that needs distribution
  const TOKEN_ADDRESS = "0x230871c8d9827de11465e0e66db31116f803d243"; 
  
  // List of recipient wallets and their percentage allocations
  const recipients = [
    {
      address: "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F", // Your wallet 
      percentage: 60 // 60% of tokens
    },
    {
      address: "0x123...", // Replace with second wallet address
      percentage: 20 // 20% of tokens
    },
    {
      address: "0x456...", // Replace with third wallet address
      percentage: 20 // 20% of tokens
    }
  ];
  
  console.log(`Distributing tokens from token contract ${TOKEN_ADDRESS}`);
  
  // Update ABI to include the rescue functions
  const tokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function owner() view returns (address)",
    "function rescueTokens(address to, uint256 amount) external",
    "function rescueTokensWithAllocation(address[] calldata recipients, uint256[] calldata percentages) external"
  ];
  
  const [signer] = await ethers.getSigners();
  
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenABI, signer);
  
  // Get token details
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const contractBalance = await token.balanceOf(TOKEN_ADDRESS);
  
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Tokens in contract: ${ethers.utils.formatUnits(contractBalance, decimals)}`);
  
  // Check if caller is owner
  const tokenOwner = await token.owner();
  const callerAddress = await signer.getAddress();
  
  if (tokenOwner.toLowerCase() !== callerAddress.toLowerCase()) {
    console.error(`❌ Error: You (${callerAddress}) are not the owner of this token (${tokenOwner})`);
    return;
  }
  
  // Calculate total percentage to ensure it's 100%
  const totalPercentage = recipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
  if (totalPercentage !== 100) {
    console.error(`❌ Error: Total percentage must be 100%, but got ${totalPercentage}%`);
    return;
  }
  
  // Prepare arrays for rescueTokensWithAllocation
  const recipientAddresses = recipients.map(r => r.address);
  const percentages = recipients.map(r => r.percentage);
  
  console.log("Using rescueTokensWithAllocation to distribute tokens...");
  console.log("Recipients:", recipientAddresses);
  console.log("Percentages:", percentages);
  
  try {
    // Use higher gas limit for Polygon Amoy
    const tx = await token.rescueTokensWithAllocation(
      recipientAddresses, 
      percentages,
      { gasLimit: 5000000 }
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Distribution successful! Transaction confirmed in block:", receipt.blockNumber);
    
    // Verify the new balances
    for (const recipient of recipients) {
      const balance = await token.balanceOf(recipient.address);
      console.log(`${recipient.address} now has ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    }
  } catch (error) {
    console.error("❌ Error distributing tokens:", error);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 