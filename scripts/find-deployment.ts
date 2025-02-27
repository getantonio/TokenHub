const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("Checking recent transactions...");
  
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  console.log("Your address:", userAddress);
  
  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  
  let totalEthSpent = ethers.BigNumber.from(0);
  let foundTransactions = 0;
  
  // Look back 1000 blocks
  const startBlock = Math.max(currentBlock - 1000, 0);
  console.log(`Scanning blocks ${startBlock} to ${currentBlock}...`);
  
  for (let i = currentBlock; i >= startBlock; i--) {
    const block = await provider.getBlock(i, true);
    if (!block || !block.transactions) continue;
    
    for (const tx of block.transactions) {
      if (!tx.from) continue;
      
      if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
        foundTransactions++;
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (!receipt) continue;
        
        const gasUsed = receipt.gasUsed;
        const gasPrice = tx.gasPrice;
        const gasCost = gasUsed.mul(gasPrice);
        const value = tx.value || ethers.BigNumber.from(0);
        const totalCost = gasCost.add(value);
        
        totalEthSpent = totalEthSpent.add(totalCost);
        
        console.log(`\nTransaction found in block ${i}:`);
        console.log(`Hash: ${tx.hash}`);
        console.log(`To: ${tx.to || 'Contract Creation'}`);
        console.log(`Value: ${ethers.utils.formatEther(value)} ETH`);
        console.log(`Gas Used: ${ethers.utils.formatEther(gasCost)} ETH`);
        console.log(`Total Cost: ${ethers.utils.formatEther(totalCost)} ETH`);
      }
    }
  }
  
  console.log(`\nFound ${foundTransactions} transactions`);
  console.log(`Total ETH spent: ${ethers.utils.formatEther(totalEthSpent)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 