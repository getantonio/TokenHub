const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ABI fragments for minimally testing the factory
const FACTORY_ABI_FRAGMENTS = [
  "function implementationContract() external view returns (address)",
  "function deploymentFee() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function getTokensByUser(address) external view returns (address[])",
  "function createToken(string,string,uint256,uint256,bool,bool) external payable returns (address)"
];

async function main() {
  console.log("Starting V1 Factory diagnosis on Polygon Amoy...");
  
  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Get the network details to verify we're on Polygon Amoy
    const network = await ethers.provider.getNetwork();
    console.log("Network:", {
      name: network.name,
      chainId: network.chainId.toString()
    });
    
    // Get the factory address from env
    const factoryAddress = process.env.FACTORY_ADDRESS || "0x07660e3b490E74a286927C7eF7219192003cFee2";
    console.log(`Using factory address: ${factoryAddress}`);
    
    // Check if there's any code at the address
    const code = await ethers.provider.getCode(factoryAddress);
    if (code === "0x") {
      console.error("No contract code at this address!");
      process.exit(1);
    }
    console.log(`Contract exists at ${factoryAddress} (${code.length / 2 - 1} bytes)`);
    
    // Create a contract instance using the minimal ABI
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI_FRAGMENTS, deployer);
    
    // Try individual functions one by one to see which ones work
    console.log("\nTesting factory functions individually:");
    
    // Test 1: Try to get implementation contract address
    console.log("\n1. Testing implementationContract():");
    try {
      const implementation = await factory.implementationContract();
      console.log("  ✅ Success! Implementation address:", implementation);
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 2: Try to get deployment fee
    console.log("\n2. Testing deploymentFee():");
    try {
      const fee = await factory.deploymentFee();
      console.log("  ✅ Success! Deployment fee:", ethers.formatUnits(fee, "ether"), "ETH");
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 3: Try to get owner
    console.log("\n3. Testing owner():");
    try {
      const owner = await factory.owner();
      console.log("  ✅ Success! Factory owner:", owner);
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 4: Try to get tokens by user
    console.log("\n4. Testing getTokensByUser():");
    try {
      const tokens = await factory.getTokensByUser(deployer.address);
      console.log("  ✅ Success! Tokens owned by deployer:", tokens.length > 0 ? tokens : "None");
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 5: Try to estimate gas for createToken
    console.log("\n5. Testing gas estimation for createToken():");
    try {
      const gasEstimate = await factory.createToken.estimateGas(
        "TestToken",
        "TEST",
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("10000", 18),
        false,
        false,
        { value: ethers.parseUnits("0.0001", "ether") }
      );
      console.log("  ✅ Success! Gas estimate:", gasEstimate.toString());
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 6: Try to encode calldata manually
    console.log("\n6. Testing manual function encoding:");
    const iface = new ethers.Interface(FACTORY_ABI_FRAGMENTS);
    try {
      const calldata = iface.encodeFunctionData("createToken", [
        "TestToken",
        "TEST",
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("10000", 18),
        false,
        false
      ]);
      console.log("  ✅ Success! Encoded calldata:", calldata);
      console.log("  Calldata length:", calldata.length);
      console.log("  Function selector:", calldata.substring(0, 10));
    } catch (error) {
      console.log("  ❌ Failed:", error.message);
    }
    
    // Test 7: Try to send a raw transaction with manual calldata
    if (process.env.SEND_TEST_TX === "true") {
      console.log("\n7. Testing raw transaction (set SEND_TEST_TX=true to run):");
      try {
        const calldata = iface.encodeFunctionData("createToken", [
          "TestToken",
          "TEST",
          ethers.parseUnits("1000", 18),
          ethers.parseUnits("10000", 18),
          false,
          false
        ]);
        
        // Send raw transaction
        const txData = {
          to: factoryAddress,
          data: calldata,
          value: ethers.parseUnits("0.0001", "ether"),
          gasLimit: 3000000
        };
        
        console.log("  Sending transaction with data:", txData);
        const tx = await deployer.sendTransaction(txData);
        console.log("  Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("  ✅ Success! Transaction confirmed in block:", receipt.blockNumber);
        console.log("  Gas used:", receipt.gasUsed.toString());
        console.log("  Status:", receipt.status);
      } catch (error) {
        console.log("  ❌ Failed:", error.message);
        
        // Check if there's a receipt in the error
        if (error.receipt) {
          console.log("  Transaction failed but was mined:");
          console.log("  Block:", error.receipt.blockNumber);
          console.log("  Gas used:", error.receipt.gasUsed?.toString());
          console.log("  Status:", error.receipt.status);
          
          if (error.receipt.logs && error.receipt.logs.length > 0) {
            console.log("  Transaction had", error.receipt.logs.length, "log entries");
          }
        }
      }
    } else {
      console.log("\n7. Skipping raw transaction test (set SEND_TEST_TX=true to run)");
    }
    
    // Final diagnosis
    console.log("\n-------------------------------------------------");
    console.log("FACTORY DIAGNOSIS SUMMARY");
    console.log("-------------------------------------------------");
    console.log("If most view functions failed, the contract may be:");
    console.log("1. Not properly initialized");
    console.log("2. Not the expected factory contract");
    console.log("3. Incompatible with the Polygon Amoy network");
    console.log("");
    console.log("RECOMMENDED ACTIONS:");
    console.log("1. Deploy a new v1 factory specific to Polygon Amoy");
    console.log("2. Use manual token creation as demonstrated in the CustomTinyToken approach");
    console.log("3. Consider switching to Ethereum Sepolia if factory functionality is critical");
    
  } catch (error) {
    console.error("Error running diagnostics:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 