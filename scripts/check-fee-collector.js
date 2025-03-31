require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const hre = require("hardhat");
const { formatEther } = require("ethers");
const { ethers } = require('hardhat');

async function main() {
  console.log("Checking fee collector setup...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Define both addresses
  const oldFactoryAddress = '0xd61a8De6392750AD9FD250a59Cfa4d55f01CE9a2';
  const newFactoryAddress = '0x676C3A877b43D2D5D16f84387798D996da06e835';
  const oldFeeCollectorAddress = '0x014146631DDF8EEa259FAF22B25d669425Ffc1A0';
  const newFeeCollectorAddress = '0xcCe75c81BD26c28Bfb38cD4d4cC51bA2F3DfCb3F';
  
  // Check old factory and fee collector
  await checkFactoryFeeCollector(oldFactoryAddress, oldFeeCollectorAddress, "OLD");
  
  // Check new factory and fee collector
  await checkFactoryFeeCollector(newFactoryAddress, newFeeCollectorAddress, "NEW");
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