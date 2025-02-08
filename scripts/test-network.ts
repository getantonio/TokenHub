const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing network with account:", signer.address);
  
  // Get the network
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", {
    name: network.name,
    chainId: network.chainId
  });

  // Get the latest block
  const block = await hre.ethers.provider.getBlock('latest');
  console.log("Latest block:", block.number);
  
  // Get gas price
  const gasPrice = await hre.ethers.provider.getFeeData();
  console.log("Gas price:", {
    gasPrice: hre.ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei'),
    maxFeePerGas: gasPrice.maxFeePerGas ? hre.ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') : 'N/A',
    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? hre.ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') : 'N/A'
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 