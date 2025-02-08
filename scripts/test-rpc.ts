const hre = require("hardhat");

async function main() {
  try {
    console.log("Testing RPC connection...");
    
    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("Connected to network:", {
      name: network.name,
      chainId: network.chainId
    });

    // Get block number
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("Current block number:", blockNumber);

    // Get gas price
    const feeData = await hre.ethers.provider.getFeeData();
    console.log("Fee data:", {
      gasPrice: feeData.gasPrice ? hre.ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
      lastBaseFeePerGas: feeData.lastBaseFeePerGas ? hre.ethers.formatUnits(feeData.lastBaseFeePerGas, 'gwei') + ' gwei' : 'N/A'
    });

    // Test account balance
    const [signer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log("Account:", signer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "AMOY");

    // Get latest block
    const block = await hre.ethers.provider.getBlock('latest');
    console.log("Latest block info:", {
      number: block.number,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      hash: block.hash
    });

  } catch (error) {
    console.error("Error testing RPC:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 