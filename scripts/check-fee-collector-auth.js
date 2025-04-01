// Check if the factory is authorized to call the fee collector
const { ethers } = require('hardhat');

async function main() {
  console.log("Checking fee collector authorization...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  const feeCollectorAddress = deploymentData.feeCollector;
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`FeeCollector address: ${feeCollectorAddress}`);
  
  // Create contract instances
  const feeCollectorABI = [
    // Interface functions
    "function getPoolCreationFee() external view returns (uint256)",
    "function collectPoolCreationFee() external payable",
    // Access control
    "function owner() external view returns (address)",
    // If authorizedCallers is present
    "function authorizedCallers(address) external view returns (bool)",
    // For newer version
    "function treasury() external view returns (address)"
  ];
  
  const feeCollector = new ethers.Contract(feeCollectorAddress, feeCollectorABI, deployer);
  
  // Check fee
  try {
    const fee = await feeCollector.getPoolCreationFee();
    console.log(`Pool creation fee: ${ethers.formatEther(fee)} ETH`);
  } catch (e) {
    console.error("Error getting pool creation fee:", e.message);
  }

  // Check owner
  try {
    const owner = await feeCollector.owner();
    console.log(`FeeCollector owner: ${owner}`);
    console.log(`Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
  } catch (e) {
    console.error("Error getting owner:", e.message);
  }
  
  // Check if factory is authorized
  try {
    const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
    console.log(`Is factory authorized? ${isAuthorized}`);
  } catch (e) {
    console.error("Error checking factory authorization:", e.message);
    console.log("This might be the new version of FeeCollector that doesn't use authorizedCallers");
  }
  
  // Try to check treasury (new version)
  try {
    const treasury = await feeCollector.treasury();
    console.log(`Treasury address: ${treasury}`);
  } catch (e) {
    console.error("Error getting treasury:", e.message);
    console.log("This might be the old version of FeeCollector that doesn't have a treasury");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 