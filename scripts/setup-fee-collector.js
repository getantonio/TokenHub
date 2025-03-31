const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { parseEther, formatEther } = require("ethers");

async function main() {
  console.log("Setting up fee collector...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
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
  
  const { feeCollector, factory } = deploymentData;
  console.log(`Fee collector address: ${feeCollector}`);
  console.log(`Factory address: ${factory}`);
  
  // Connect to fee collector
  const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollector);
  
  // Set pool creation fee (0.05 ETH)
  console.log("Setting pool creation fee...");
  const poolCreationFee = parseEther("0.05");
  await feeCollectorContract.setPoolCreationFee(poolCreationFee);
  console.log(`Pool creation fee set to: ${formatEther(poolCreationFee)} ETH`);
  
  // Authorize factory
  console.log("Authorizing factory...");
  const tx = await feeCollectorContract.authorizeCaller(factory); // Store the transaction
  console.log(`Authorization transaction hash: ${tx.hash}`);
  await tx.wait(); // Wait for the transaction to be mined
  console.log("Authorization transaction confirmed.");
  
  // Verify authorization
  const isAuthorized = await feeCollectorContract.authorizedCallers(factory);
  console.log(`Factory authorization status: ${isAuthorized}`);
  
  if (isAuthorized) {
    console.log("✅ Fee collector setup complete!");
  } else {
    console.log("❌ Fee collector setup failed - factory not authorized.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 