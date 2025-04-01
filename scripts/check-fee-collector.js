require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const hre = require("hardhat");
const { formatEther } = require("ethers");
const { ethers } = require('hardhat');

async function main() {
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  const feeCollectorAddress = "0x9519C9b492BcD126593B4216e0da052C0b25A216";
  
  console.log("Checking fee collector setup...");
  
  // Get the contracts
  const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
  const feeCollector = await hre.ethers.getContractAt("FeeCollector", feeCollectorAddress);
  const [signer] = await hre.ethers.getSigners();
  
  try {
    // Check fee collector in factory
    const factoryFeeCollector = await factory.feeCollector();
    console.log("Fee collector in factory:", factoryFeeCollector);
    console.log("Expected fee collector:", feeCollectorAddress);
    console.log("Matches:", factoryFeeCollector.toLowerCase() === feeCollectorAddress.toLowerCase());
    
    // Check fee collector owner
    const feeCollectorOwner = await feeCollector.owner();
    console.log("\nFee collector owner:", feeCollectorOwner);
    console.log("Signer address:", signer.address);
    console.log("Is signer owner:", feeCollectorOwner.toLowerCase() === signer.address.toLowerCase());
    
    // Check if factory is authorized
    const isFactoryAuthorized = await feeCollector.authorizedCallers(factoryAddress);
    console.log("\nIs factory authorized:", isFactoryAuthorized);
    
    // Get pool creation fee
    const poolCreationFee = await feeCollector.getPoolCreationFee();
    console.log("\nPool creation fee:", ethers.formatEther(poolCreationFee), "ETH");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

async function checkFactoryFeeCollector(factoryAddress, feeCollectorAddress, label) {
  console.log(`\n========== ${label} SETUP ==========`);
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`Fee collector address: ${feeCollectorAddress}`);
  
  try {
    // Connect to factory contract
    const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
    
    // Get fee collector from factory
    const factoryFeeCollector = await factory.feeCollector();
    console.log(`Fee collector in factory: ${factoryFeeCollector}`);
    console.log(`Matches expected: ${factoryFeeCollector.toLowerCase() === feeCollectorAddress.toLowerCase()}`);
    
    // Connect to fee collector contract
    const feeCollector = await hre.ethers.getContractAt("FeeCollector", feeCollectorAddress);
    
    // Check pool creation fee
    const poolCreationFee = await feeCollector.getPoolCreationFee();
    console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
    
    // Check if factory is authorized
    try {
      const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
      console.log(`Factory authorized: ${isAuthorized}`);
    } catch (error) {
      console.log(`Could not check authorization status: ${error.message}`);
    }
    
    // Check if a call to this fee collector would succeed
    try {
      const callResult = await factory.callStatic.createLendingPool(
        "0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056",
        "Test Pool",
        "TEST-LP",
        7500,
        1000,
        { value: poolCreationFee }
      );
      console.log("Call simulation successful!");
    } catch (error) {
      console.log(`Call simulation failed: ${error.message}`);
    }
  } catch (error) {
    console.error(`Error checking ${label} setup:`, error);
  }
}

async function checkFeeCollectorContractStructure() {
  console.log("Checking fee collector contract structure...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  const feeCollectorAddress = deploymentData.feeCollector;
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`FeeCollector address: ${feeCollectorAddress}`);
  
  // Create contract instance with a comprehensive ABI that covers both versions
  const feeCollectorABI = [
    // Common functions
    "function owner() external view returns (address)",
    "function getPoolCreationFee() external view returns (uint256)",
    "function poolCreationFee() external view returns (uint256)",
    
    // Old version functions
    "function authorizedCallers(address) external view returns (bool)",
    "function authorizeCaller(address) external",
    "function deauthorizeCaller(address) external",
    "function collectPoolCreationFee() external payable",
    "function collectProtocolFees() external payable",
    "function withdrawFees(address payable, uint256) external",
    
    // New version functions
    "function treasury() external view returns (address)",
    "function protocolFeePercentage() external view returns (uint256)",
    "function setPoolCreationFee(uint256) external",
    "function collectTokenFee(address, uint256) external",
    "function withdrawNativeFees() external",
    "function withdrawTokenFees(address) external"
  ];
  
  const feeCollector = new ethers.Contract(feeCollectorAddress, feeCollectorABI, deployer);
  
  console.log("\nChecking contract functions...");
  const functions = [
    { name: "owner()", description: "Get owner address" },
    { name: "getPoolCreationFee()", description: "Get pool creation fee" },
    { name: "poolCreationFee()", description: "Direct pool creation fee access" },
    { name: "authorizedCallers(address)", description: "Check if an address is authorized (old version)" },
    { name: "treasury()", description: "Get treasury address (new version)" },
    { name: "protocolFeePercentage()", description: "Get protocol fee percentage" }
  ];
  
  for (const func of functions) {
    try {
      console.log(`\nTesting: ${func.description} (${func.name})`);
      
      if (func.name === "authorizedCallers(address)") {
        const result = await feeCollector.authorizedCallers(factoryAddress);
        console.log(`Result: ${result}`);
      } else if (func.name === "getPoolCreationFee()") {
        const fee = await feeCollector.getPoolCreationFee();
        console.log(`Result: ${fee.toString()} wei`);
        try {
          console.log(`Result (in ETH): ${ethers.utils.formatEther(fee)} ETH`);
        } catch (e) {
          console.log(`Result (converted manually): ${Number(fee) / 1e18} ETH`);
        }
      } else if (func.name === "poolCreationFee()") {
        const fee = await feeCollector.poolCreationFee();
        console.log(`Result: ${fee.toString()} wei`);
        try {
          console.log(`Result (in ETH): ${ethers.utils.formatEther(fee)} ETH`);
        } catch (e) {
          console.log(`Result (converted manually): ${Number(fee) / 1e18} ETH`);
        }
      } else {
        const result = await feeCollector[func.name.split('(')[0]]();
        console.log(`Result: ${result}`);
      }
      
      console.log("✅ Function exists");
    } catch (e) {
      console.log(`❌ Function does not exist or is inaccessible: ${e.message}`);
    }
  }
  
  console.log("\nChecking fee collector version based on function availability...");
  
  let isOldVersion = false;
  let isNewVersion = false;
  
  try {
    await feeCollector.authorizedCallers(factoryAddress);
    isOldVersion = true;
    console.log("✅ Has authorizedCallers function (old version)");
  } catch (e) {
    console.log("❌ No authorizedCallers function");
  }
  
  try {
    await feeCollector.treasury();
    isNewVersion = true;
    console.log("✅ Has treasury function (new version)");
  } catch (e) {
    console.log("❌ No treasury function");
  }
  
  if (isOldVersion && !isNewVersion) {
    console.log("\nCONCLUSION: This is the OLD version of the FeeCollector contract");
    console.log("This version requires factory authorization via authorizeCaller()");
  } else if (isNewVersion && !isOldVersion) {
    console.log("\nCONCLUSION: This is the NEW version of the FeeCollector contract");
    console.log("This version doesn't use authorization, any contract can call collectPoolCreationFee()");
  } else if (isOldVersion && isNewVersion) {
    console.log("\nCONCLUSION: This appears to be a HYBRID version with both old and new features");
  } else {
    console.log("\nCONCLUSION: Could not determine the contract version");
  }
  
  console.log("\nChecking factory connection to fee collector...");
  const factoryABI = [
    "function feeCollector() external view returns (address)",
    "function createLendingPool(address, string, string, uint256, uint256) external payable returns (address)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  try {
    const configuredFeeCollector = await factory.feeCollector();
    console.log(`FeeCollector in factory: ${configuredFeeCollector}`);
    console.log(`Match with expected address: ${configuredFeeCollector.toLowerCase() === feeCollectorAddress.toLowerCase()}`);
  } catch (e) {
    console.error("Error getting feeCollector from factory:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 