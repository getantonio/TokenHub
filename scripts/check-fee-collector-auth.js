// Check if the factory is authorized to call the fee collector
const { ethers } = require('hardhat');
const { formatEther } = require('ethers/lib/utils');

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
    console.log(`Pool creation fee: ${ethers.utils.formatEther(fee)} ETH`);
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
  
  // Check if authorizedCallers is present (old version of contract)
  try {
    const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
    console.log(`Is factory authorized as caller? ${isAuthorized}`);
  } catch (e) {
    console.log("Contract doesn't have 'authorizedCallers' function - likely using newer version");
    
    // Check treasury (new version of contract)
    try {
      const treasury = await feeCollector.treasury();
      console.log(`Treasury address: ${treasury}`);
    } catch (treasuryError) {
      console.error("Error getting treasury:", treasuryError.message);
    }
  }

  console.log("\nChecking factory contract...");
  const factoryABI = [
    "function feeCollector() external view returns (address)",
    "function owner() external view returns (address)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  try {
    const configuredFeeCollector = await factory.feeCollector();
    console.log(`FeeCollector configured in factory: ${configuredFeeCollector}`);
    console.log(`Does it match the expected address? ${configuredFeeCollector.toLowerCase() === feeCollectorAddress.toLowerCase()}`);
  } catch (e) {
    console.error("Error getting feeCollector from factory:", e.message);
  }
  
  try {
    const factoryOwner = await factory.owner();
    console.log(`Factory owner: ${factoryOwner}`);
    console.log(`Is deployer the factory owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  } catch (e) {
    console.error("Error getting factory owner:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 