// Check FeeCollector Owner script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Checking FeeCollector owner...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Current address: ${deployer.address}`);
  
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
  
  // Get FeeCollector address
  const { feeCollector } = deploymentData;
  
  console.log(`FeeCollector address: ${feeCollector}`);
  
  // Connect to FeeCollector contract
  const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollector);
  
  // Check who owns the FeeCollector
  const owner = await feeCollectorContract.owner();
  console.log(`FeeCollector owner: ${owner}`);
  
  if (owner === deployer.address) {
    console.log("You are the owner of the FeeCollector contract.");
  } else {
    console.log("You are NOT the owner of the FeeCollector contract.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 