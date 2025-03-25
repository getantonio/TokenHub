const { ethers } = require("hardhat");

async function main() {
  // Get the address from environment or hardcode
  const factoryAddress = "0x07660e3b490E74a286927C7eF7219192003cFee2"; // V1 factory
  
  console.log("Analyzing V1 factory at:", factoryAddress);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using account:", deployerAddress);
  
  // Check if the contract exists
  const code = await ethers.provider.getCode(factoryAddress);
  if (code === '0x') {
    console.error("❌ No contract found at this address");
    return;
  }
  
  console.log("✅ Contract code found at this address (bytecode size:", code.length, "bytes)");
  
  // Get the contract factory from our Solidity compilation
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
  
  // Create raw transaction to call a simple view function - deploymentFee()
  const encodedData = TokenFactory.interface.encodeFunctionData("deploymentFee", []);
  
  console.log("\nSending raw call to deploymentFee()...");
  console.log("Encoded function data:", encodedData);
  
  try {
    // Make direct call to the contract
    const result = await ethers.provider.call({
      to: factoryAddress,
      data: encodedData
    });
    
    console.log("✅ Call succeeded, raw result:", result);
    
    // Try to decode the result
    const decodedResult = TokenFactory.interface.decodeFunctionResult("deploymentFee", result);
    console.log("Deployment fee:", ethers.formatEther(decodedResult[0]), "MATIC");
    
  } catch (error) {
    console.log("❌ Call failed:", error.message);
  }
  
  // Try a simple boolean view function - paused()
  const pausedData = TokenFactory.interface.encodeFunctionData("paused", []);
  
  console.log("\nSending raw call to paused()...");
  console.log("Encoded function data:", pausedData);
  
  try {
    const result = await ethers.provider.call({
      to: factoryAddress,
      data: pausedData
    });
    
    console.log("✅ Call succeeded, raw result:", result);
    
    // Try to decode the result
    const decodedResult = TokenFactory.interface.decodeFunctionResult("paused", result);
    console.log("Contract paused:", decodedResult[0]);
    
  } catch (error) {
    console.log("❌ Call failed:", error.message);
  }
  
  // Try to send a raw token creation transaction with minimal parameters
  console.log("\nPreparing token creation transaction...");
  
  // Minimum viable token parameters
  const minTokenParams = {
    name: "Mini Test Token",
    symbol: "MINI",
    initialSupply: ethers.parseUnits("100", 18), // Just 100 tokens
    maxSupply: ethers.parseUnits("1000", 18),
    owner: deployerAddress,
    enableBlacklist: false,
    enableTimeLock: false,
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0, 
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 0,
    liquidityLockDuration: 0,
    walletAllocations: [
      {
        wallet: deployerAddress,
        percentage: 100,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  try {
    // Encode the createToken function call
    const createTokenData = TokenFactory.interface.encodeFunctionData("createToken", [minTokenParams]);
    console.log("Encoded createToken data:", createTokenData);
    console.log("Data length:", createTokenData.length, "bytes");
    
    // Default fee
    const fee = ethers.parseEther("0.05");
    console.log("Using fee:", ethers.formatEther(fee), "MATIC");
    
    // Create and send the transaction
    const tx = {
      to: factoryAddress,
      from: deployerAddress,
      data: createTokenData,
      value: fee,
      gasLimit: 3000000
    };
    
    console.log("Sending raw transaction...");
    const txResponse = await deployer.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);
    
    console.log("Waiting for confirmation...");
    const receipt = await txResponse.wait();
    
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("Event logs:", receipt.logs.length);
      
      // Try to decode the event logs if there are any
      for (let i = 0; i < receipt.logs.length; i++) {
        try {
          const log = receipt.logs[i];
          const parsedLog = TokenFactory.interface.parseLog(log);
          console.log(`Log ${i}:`, parsedLog.name, parsedLog.args);
          
          // If this is the TokenCreated event, extract the token address
          if (parsedLog.name === 'TokenCreated') {
            console.log("\n✅ Token created successfully at address:", parsedLog.args.tokenAddress);
          }
        } catch (error) {
          console.log(`Could not parse log ${i}`);
        }
      }
    } else {
      console.log("No event logs found in receipt");
    }
    
  } catch (error) {
    console.error("❌ Token creation failed:", error.message);
    
    if (error.error) {
      console.error("Error data:", error.error);
    }
    
    if (error.transaction) {
      console.log("Failed transaction:", error.transaction);
    }
    
    if (error.receipt) {
      console.log("Transaction receipt:", error.receipt);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 