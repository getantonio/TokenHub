const hre = require("hardhat");

async function main() {
  try {
    const [signer] = await hre.ethers.getSigners();
    console.log("Account:", signer.address);
    
    // Get current nonce
    const nonce = await hre.ethers.provider.getTransactionCount(signer.address, "latest");
    console.log("Current nonce:", nonce);
    
    // Get pending nonce
    const pendingNonce = await hre.ethers.provider.getTransactionCount(signer.address, "pending");
    console.log("Pending nonce:", pendingNonce);
    
    if (nonce !== pendingNonce) {
      console.log("There are pending transactions!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 