const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther } = require("ethers");

async function main() {
  console.log("Testing FeeCollector functions...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${formatEther(balance)} ETH`);
  
  // Load deployment data
  let deploymentData;
  try {
    const filePath = path.join(__dirname, `../deployments/defi-${hre.network.name}.json`);
    const fileData = fs.readFileSync(filePath, 'utf8');
    deploymentData = JSON.parse(fileData);
    console.log("Loaded deployment data from file");
  } catch (error) {
    console.error("Error loading deployment data:", error);
    return;
  }
  
  // Get deployed addresses
  const { feeCollector } = deploymentData;
  console.log(`FeeCollector address: ${feeCollector}`);
  
  // Connect to the fee collector contract
  const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollector);
  
  try {
    // Check who owns the fee collector
    const feeCollectorOwner = await feeCollectorContract.owner();
    console.log(`FeeCollector owner: ${feeCollectorOwner}`);
    console.log(`Is deployer the fee collector owner? ${feeCollectorOwner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    // Get the current pool creation fee
    const poolCreationFee = await feeCollectorContract.getPoolCreationFee();
    console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
    
    // Try to send fee directly to the fee collector
    console.log("Attempting to call collectPoolCreationFee...");
    
    const tx = await feeCollectorContract.collectPoolCreationFee({ value: poolCreationFee });
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed. Status: ${receipt.status ? 'Success' : 'Failed'}`);
    
    // Check contract balance
    const contractBalance = await hre.ethers.provider.getBalance(feeCollector);
    console.log(`FeeCollector contract balance: ${formatEther(contractBalance)} ETH`);
    
    console.log("\nTest completed successfully!");
    
  } catch (error) {
    console.error("Error testing fee collector:");
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 