const hre = require("hardhat");
const { ethers } = require("ethers");

// Common initialization function names to try
const initFunctionNames = [
  "initialize", 
  "init", 
  "__initialize", 
  "__init__", 
  "setup"
];

async function main() {
  const factoryAddress = "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB";
  console.log("Trying to initialize contract at address:", factoryAddress);
  
  const provider = new ethers.JsonRpcProvider(hre.network.config.url);
  const [signer] = await hre.ethers.getSigners();
  
  // Get the bytecode from the address
  const bytecode = await provider.getCode(factoryAddress);
  if (bytecode === "0x") {
    console.log("⚠️ No contract deployed at this address!");
    return;
  }
  
  console.log("✅ Contract exists at this address");
  console.log("Current account:", signer.address);
  
  // Define ABI fragments for various initialization functions
  const initFunctions = {};
  
  for (const funcName of initFunctionNames) {
    initFunctions[funcName] = [
      // No parameters
      `function ${funcName}()`,
      // With implementation, oracle, model params
      `function ${funcName}(address _implementation, address _priceOracle, address _interestRateModel, address _feeCollector)`,
      // With just oracle and model
      `function ${funcName}(address _priceOracle, address _interestRateModel)`
    ];
  }
  
  // Try each initialization function
  for (const funcName of initFunctionNames) {
    console.log(`\nTrying to call ${funcName} functions...`);
    
    for (const funcAbi of initFunctions[funcName]) {
      try {
        const contract = new ethers.Contract(factoryAddress, [funcAbi], provider);
        console.log(`Testing ${funcAbi}...`);
        
        // Check if the function exists using estimateGas
        try {
          if (funcAbi.includes("_implementation")) {
            // For init with implementation, oracle, model, fee collector
            const params = [
              "0x0000000000000000000000000000000000000001", // Dummy implementation
              "0x0000000000000000000000000000000000000002", // Dummy oracle 
              "0x0000000000000000000000000000000000000003", // Dummy model
              "0x0000000000000000000000000000000000000004"  // Dummy fee collector
            ];
            await contract.connect(signer).getFunction(funcName).estimateGas(...params);
            console.log(`✅ Function exists: ${funcAbi}`);
            console.log(`Attempting to call the function...`);
            // Since this is just a test, we won't actually execute it
          } else if (funcAbi.includes("_priceOracle")) {
            // For init with just oracle and model
            const params = [
              "0x0000000000000000000000000000000000000002", // Dummy oracle
              "0x0000000000000000000000000000000000000003"  // Dummy model
            ];
            await contract.connect(signer).getFunction(funcName).estimateGas(...params);
            console.log(`✅ Function exists: ${funcAbi}`);
            console.log(`Attempting to call the function...`);
            // Since this is just a test, we won't actually execute it
          } else {
            // For init with no params
            await contract.connect(signer).getFunction(funcName).estimateGas();
            console.log(`✅ Function exists: ${funcAbi}`);
            console.log(`Attempting to call the function...`);
            // Since this is just a test, we won't actually execute it
          }
        } catch (error) {
          if (error.message.includes("function selector was not recognized")) {
            console.log(`❌ Function does not exist: ${funcAbi}`);
          } else {
            console.log(`⚠️ Function exists but call failed: ${funcAbi}`);
            console.log(`Error: ${error.reason || error.message}`);
          }
        }
      } catch (error) {
        console.log(`Error testing ${funcAbi}: ${error.message}`);
      }
    }
  }
  
  // Check contract owner
  try {
    const ownerAbi = ["function owner() view returns (address)"];
    const contract = new ethers.Contract(factoryAddress, ownerAbi, provider);
    const owner = await contract.owner();
    console.log(`\nContract owner: ${owner}`);
    console.log(`Your address: ${signer.address}`);
    if (owner.toLowerCase() === signer.address.toLowerCase()) {
      console.log("✅ You are the owner of this contract");
    } else {
      console.log("⚠️ You are NOT the owner of this contract");
    }
  } catch (error) {
    console.log(`Error checking owner: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 