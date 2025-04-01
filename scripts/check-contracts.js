// Check contracts on Sepolia
const { ethers } = require('hardhat');

async function main() {
  console.log("Checking contracts on the network...");
  
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
    console.log(`Is factory authorized as caller? ${isAuthorized}`);
  } catch (e) {
    console.error("Error checking factory authorization:", e.message);
  }
  
  console.log("\nChecking factory contract...");
  const factoryABI = [
    "function feeCollector() external view returns (address)",
    "function owner() external view returns (address)",
    "function implementation() external view returns (address)",
    "function assetToPools(address) external view returns (address)",
    "function getPoolCount() external view returns (uint256)"
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
  
  try {
    const implementation = await factory.implementation();
    console.log(`Implementation address: ${implementation}`);
  } catch (e) {
    console.error("Error getting implementation address:", e.message);
  }
  
  console.log("\nChecking if a pool already exists for the test asset...");
  const testAsset = "0xdef1aa0fb7b7c09a5fc3e28625d7a1a2b0012d6a"; // DEFLIQ token
  try {
    const existingPool = await factory.assetToPools(testAsset);
    console.log(`Existing pool for DEFLIQ: ${existingPool}`);
    if (existingPool === "0x0000000000000000000000000000000000000000") {
      console.log("No existing pool found for this asset");
    }
  } catch (e) {
    console.error("Error checking existing pool:", e.message);
  }
  
  console.log("\nTrying a static call to check for other potential issues...");
  try {
    const poolCount = await factory.getPoolCount();
    console.log(`Total pools deployed: ${poolCount}`);
  } catch (e) {
    console.error("Error getting pool count:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 