// Check Factory Owner script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Checking factory owner...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Checking from account: ${deployer.address}`);
  
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
  
  // Get deployed factory address
  const { factory, feeCollector } = deploymentData;
  console.log(`Factory address: ${factory}`);
  console.log(`Fee Collector address: ${feeCollector}`);
  
  // Connect to factory contract
  const factoryContract = await hre.ethers.getContractAt("LoanPoolFactory", factory);
  const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollector);
  
  // Get factory owner
  const factoryOwner = await factoryContract.owner();
  console.log(`Factory owner: ${factoryOwner}`);
  console.log(`Is deployer the factory owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  // Get fee collector owner
  const feeCollectorOwner = await feeCollectorContract.owner();
  console.log(`Fee Collector owner: ${feeCollectorOwner}`);
  console.log(`Is deployer the fee collector owner? ${feeCollectorOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  // Check which address is allowed to create pools
  const canCallFactory = await factoryContract.feeCollector();
  console.log(`Address allowed to create pools (feeCollector): ${canCallFactory}`);
  console.log(`Does it match the fee collector contract? ${canCallFactory.toLowerCase() === feeCollector.toLowerCase()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 