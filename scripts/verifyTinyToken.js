const { ethers } = require("hardhat");

async function main() {
  // Set the deployed token address
  const tokenAddress = "0xcF50a5981d2cBE193F1f5540DA114575E8E7B283";
  
  console.log("Verifying TinyToken at:", tokenAddress);
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using account:", deployerAddress);
  
  // Get the TinyToken contract factory
  const TinyToken = await ethers.getContractFactory("TinyToken");
  
  // Attach to the deployed contract
  const tinyToken = TinyToken.attach(tokenAddress);
  
  try {
    // Read basic token info
    const name = await tinyToken.name();
    const symbol = await tinyToken.symbol();
    const decimals = await tinyToken.decimals();
    const totalSupply = await tinyToken.totalSupply();
    
    console.log("Token details:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Decimals:", decimals.toString());
    console.log("- Total Supply:", ethers.formatUnits(totalSupply, decimals));
    
    // Check deployer balance
    const deployerBalance = await tinyToken.balanceOf(deployerAddress);
    console.log("- Deployer Balance:", ethers.formatUnits(deployerBalance, decimals));
    
    // Try a small transfer to self
    console.log("\nSending a small test transfer to self...");
    const transferAmount = ethers.parseUnits("1", decimals); // Just 1 token
    
    const tx = await tinyToken.transfer(deployerAddress, transferAmount);
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transfer confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Simplified event checking
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("✅ Events emitted:", receipt.logs.length);
      
      // Read balance again to confirm
      const newBalance = await tinyToken.balanceOf(deployerAddress);
      console.log("- Balance after transfer:", ethers.formatUnits(newBalance, decimals));
    }
    
    console.log("\n✅ TinyToken is working correctly on Polygon Amoy!");
    console.log("This confirms that basic tokens can be created and used on this network.");
    console.log("For token creation on this network, it's recommended to:");
    console.log("1. Use a direct token deployment approach rather than the factory");
    console.log("2. Keep token parameters minimal (small total supply)");
    console.log("3. Test thoroughly before deploying to production");
    
  } catch (error) {
    console.error("❌ Error interacting with token:", error.message);
    
    if (error.error) {
      console.error("Error details:", error.error.message);
    }
    
    if (error.transaction) {
      console.log("Transaction:", error.transaction.hash);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 