const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying TinyToken directly with ethers.js...");
  
  // Compile TinyToken and get its bytecode
  console.log("Compiling TinyToken...");
  await hre.run("compile");
  
  // Get the deployment bytecode from the compiled artifact
  const tinyTokenArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts/contracts/TinyToken.sol/TinyToken.json")
    )
  );
  
  const bytecode = tinyTokenArtifact.bytecode;
  console.log("Bytecode length:", bytecode.length, "bytes");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using deployer account:", deployerAddress);
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Create a direct deployment transaction
  const nonce = await ethers.provider.getTransactionCount(deployerAddress);
  console.log("Current nonce:", nonce);
  
  // Send the raw transaction with bytecode directly
  try {
    console.log("Sending transaction...");
    
    // Create Transaction
    const tx = {
      from: deployerAddress,
      data: bytecode,
      gasLimit: ethers.parseUnits("2000000", "wei"),
      nonce: nonce
    };
    
    // Send it
    const txResponse = await deployer.sendTransaction(tx);
    console.log("Transaction hash:", txResponse.hash);
    
    console.log("Waiting for confirmation...");
    const receipt = await txResponse.wait();
    
    if (receipt.status === 1) {
      console.log("✅ TinyToken deployed successfully!");
      console.log("Contract address:", receipt.contractAddress);
      console.log("Transaction hash:", receipt.hash);
      console.log("Block number:", receipt.blockNumber);
      console.log("Gas used:", receipt.gasUsed.toString());
      
      console.log("Add to MetaMask with:");
      console.log("- Address:", receipt.contractAddress);
      console.log("- Symbol: TINY");
      console.log("- Decimals: 18");
    } else {
      console.log("❌ Deployment failed on-chain");
      console.log("Receipt:", receipt);
    }
  } catch (error) {
    console.error("❌ Failed to deploy contract:", error.message);
    
    if (error.error) {
      console.error("Error details:", error.error);
    }
    
    if (error.transaction) {
      console.log("Transaction details:");
      console.log("- Data length:", error.transaction.data ? error.transaction.data.length : "no data");
      console.log("- To:", error.transaction.to || "contract creation");
      console.log("- From:", error.transaction.from);
      console.log("- Value:", error.transaction.value?.toString() || "none");
      console.log("- Gas limit:", error.transaction.gasLimit?.toString() || "none");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 