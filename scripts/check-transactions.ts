const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking transactions for:", signer.address);
  
  // Get the last 10 blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  
  let totalSpent = ethers.parseEther("0");
  
  // Look through the last 1000 blocks
  for (let i = currentBlock; i > currentBlock - 1000; i--) {
    const block = await ethers.provider.getBlock(i, true);
    if (!block) continue;
    
    for (const tx of block.transactions) {
      if (tx.from.toLowerCase() === signer.address.toLowerCase()) {
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const gasCost = receipt.gasUsed * receipt.gasPrice;
        const value = tx.value;
        const totalCost = gasCost + value;
        
        if (totalCost > 0) {
          console.log("\nTransaction:", tx.hash);
          console.log("To:", tx.to);
          console.log("Value:", ethers.formatEther(value), "ETH");
          console.log("Gas Cost:", ethers.formatEther(gasCost), "ETH");
          console.log("Total Cost:", ethers.formatEther(totalCost), "ETH");
          totalSpent = totalSpent + totalCost;
        }
      }
    }
  }
  
  console.log("\nTotal ETH spent in recent transactions:", ethers.formatEther(totalSpent), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 