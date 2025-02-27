const hre = require("hardhat");
const { ethers } = hre;

interface Transaction {
  hash: string;
  blockNumber: number;
  to?: string;
  from?: string;
  value: string;
  gasCost?: string;
  totalCost?: string;
  timestamp: number;
  type?: 'SENT' | 'RECEIVED';
}

async function main() {
  try {
    // Get network and confirm we're on Sepolia
    const network = await ethers.provider.getNetwork();
    console.log("\nNetwork Details:", {
      name: network.name,
      chainId: Number(network.chainId)
    });
    
    if (Number(network.chainId) !== 11155111) {
      throw new Error("This script must be run on Sepolia network");
    }

    // Get signer and balance
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    console.log("\nWallet Details:");
    console.log("Address:", address);
    
    const balance = await ethers.provider.getBalance(address);
    console.log("Current Balance:", ethers.formatEther(balance), "ETH");

    // Get current block
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("\nBlock Details:");
    console.log("Current Block:", currentBlock);
    
    // Look back further (2000 blocks) to find more history
    const startBlock = Math.max(currentBlock - 2000, 0);
    console.log(`\nScanning blocks ${startBlock} to ${currentBlock}`);
    console.log("This may take a few minutes...\n");

    const transactions: Transaction[] = [];
    let totalEthSpent = ethers.parseEther("0");
    
    for (let blockNumber = currentBlock; blockNumber >= startBlock; blockNumber--) {
      if (blockNumber % 100 === 0) {
        console.log(`Scanning block ${blockNumber}...`);
      }

      try {
        const block = await ethers.provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) continue;

        for (const tx of block.transactions) {
          // Check transactions FROM your address (outgoing)
          if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
            const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
            if (!receipt) continue;

            const gasCost = receipt.gasUsed * receipt.gasPrice;
            const value = tx.value || ethers.parseEther("0");
            const totalCost = gasCost + value;

            transactions.push({
              hash: tx.hash,
              blockNumber: blockNumber,
              to: tx.to || 'Contract Creation',
              value: ethers.formatEther(value),
              gasCost: ethers.formatEther(gasCost),
              totalCost: ethers.formatEther(totalCost),
              timestamp: block.timestamp,
              type: 'SENT'
            });

            totalEthSpent = totalEthSpent + totalCost;
          }

          // Check transactions TO your address (incoming)
          if (tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
            transactions.push({
              hash: tx.hash,
              blockNumber: blockNumber,
              from: tx.from,
              value: ethers.formatEther(tx.value || 0),
              timestamp: block.timestamp,
              type: 'RECEIVED'
            });
          }
        }
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error.message);
      }
    }

    // Sort transactions by block number (most recent first)
    transactions.sort((a, b) => b.blockNumber - a.blockNumber);

    // Print results
    console.log("\n=== Transaction History ===");
    for (const tx of transactions) {
      console.log("\nTransaction:", tx.hash);
      console.log("Block:", tx.blockNumber);
      console.log("Time:", new Date(tx.timestamp * 1000).toLocaleString());
      
      if (tx.type === 'RECEIVED') {
        console.log("Type: RECEIVED");
        console.log("From:", tx.from);
        console.log("Value:", tx.value, "ETH");
      } else {
        console.log("Type: SENT");
        console.log("To:", tx.to);
        console.log("Value Sent:", tx.value, "ETH");
        console.log("Gas Cost:", tx.gasCost, "ETH");
        console.log("Total Cost:", tx.totalCost, "ETH");
      }
    }

    console.log("\n=== Summary ===");
    console.log("Total Transactions Found:", transactions.length);
    console.log("Total ETH Spent:", ethers.formatEther(totalEthSpent), "ETH");

  } catch (error) {
    console.error("\nScript Error:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 