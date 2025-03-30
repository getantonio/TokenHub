const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  const factoryAddress = "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB";
  console.log("Checking contract at address:", factoryAddress);
  
  const provider = new ethers.JsonRpcProvider(hre.network.config.url);
  
  // Get the bytecode from the address
  const bytecode = await provider.getCode(factoryAddress);
  console.log("Bytecode length:", bytecode.length);
  
  // If bytecode is just 0x, the contract doesn't exist
  if (bytecode === "0x") {
    console.log("⚠️ No contract deployed at this address!");
    return;
  }
  
  console.log("✅ Contract exists at this address");
  
  // Define minimal ABIs for testing
  const poolFactoryAbi = [
    "function implementation() view returns (address)",
    "function getAllPools() view returns (address[])",
    "function getPoolCount() view returns (uint256)",
    "function owner() view returns (address)",
    "function priceOracle() view returns (address)",
    "function interestRateModel() view returns (address)",
    "function feeCollector() view returns (address)"
  ];
  
  // Create a contract instance
  const factory = new ethers.Contract(factoryAddress, poolFactoryAbi, provider);
  
  // Try to check if the contract has been initialized by calling some view functions
  console.log("\nTrying to call view functions:");
  
  try {
    const implementation = await factory.implementation();
    console.log("Implementation:", implementation);
  } catch (error) {
    console.log("❌ Failed to call implementation():", error.reason || error.message);
  }
  
  try {
    const allPools = await factory.getAllPools();
    console.log("All pools:", allPools);
  } catch (error) {
    console.log("❌ Failed to call getAllPools():", error.reason || error.message);
  }
  
  try {
    const poolCount = await factory.getPoolCount();
    console.log("Pool count:", poolCount.toString());
  } catch (error) {
    console.log("❌ Failed to call getPoolCount():", error.reason || error.message);
  }
  
  try {
    const owner = await factory.owner();
    console.log("Owner:", owner);
  } catch (error) {
    console.log("❌ Failed to call owner():", error.reason || error.message);
  }

  try {
    const priceOracle = await factory.priceOracle();
    console.log("Price Oracle:", priceOracle);
  } catch (error) {
    console.log("❌ Failed to call priceOracle():", error.reason || error.message);
  }

  try {
    const interestRateModel = await factory.interestRateModel();
    console.log("Interest Rate Model:", interestRateModel);
  } catch (error) {
    console.log("❌ Failed to call interestRateModel():", error.reason || error.message);
  }

  try {
    const feeCollector = await factory.feeCollector();
    console.log("Fee Collector:", feeCollector);
  } catch (error) {
    console.log("❌ Failed to call feeCollector():", error.reason || error.message);
  }
  
  // Check if this is a proxy contract by reading EIP-1967 slots
  console.log("\nChecking for proxy implementation:");
  const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  
  const implSlotData = await provider.getStorage(factoryAddress, implementationSlot);
  const adminSlotData = await provider.getStorage(factoryAddress, adminSlot);
  
  console.log("Implementation slot:", implSlotData);
  console.log("Admin slot:", adminSlotData);
  
  // Convert to address if it's not zero
  if (implSlotData !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    // Extract the address from the slot data (last 20 bytes)
    const implAddress = "0x" + implSlotData.slice(-40);
    console.log("✅ This is a proxy contract. Implementation:", implAddress);
    
    // Check if the implementation has code
    const implCode = await provider.getCode(implAddress);
    if (implCode !== "0x") {
      console.log("✅ Implementation contract exists");
    } else {
      console.log("⚠️ Implementation address has no code");
    }
  }
  
  // Check first few storage slots to try to determine contract type
  console.log("\nReading first few storage slots:");
  for (let i = 0; i < 5; i++) {
    try {
      const data = await provider.getStorage(factoryAddress, ethers.toBeHex(i));
      console.log(`Slot ${i}:`, data);
    } catch (error) {
      console.error(`Error reading slot ${i}:`, error.reason || error.message);
    }
  }

  // Check if it's an ERC20 token
  const erc20Abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
  ];

  const erc20 = new ethers.Contract(factoryAddress, erc20Abi, provider);
  
  console.log("\nChecking if it's an ERC20 token:");
  try {
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();
    const totalSupply = await erc20.totalSupply();
    
    console.log(`✅ This is an ERC20 token: ${name} (${symbol})`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${totalSupply.toString()}`);
  } catch (error) {
    console.log("❌ Not an ERC20 token:", error.reason || error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 