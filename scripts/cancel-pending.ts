const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Account:", signer.address);

  const currentNonce = await signer.getNonce();
  console.log("Current nonce:", currentNonce);

  // Send cancellation transaction for nonce 69
  console.log("Cancelling transaction with nonce 69...");
    
  // Send transaction to self with 0 ETH and higher gas price
  const tx = await signer.sendTransaction({
    to: signer.address,
    value: 0,
    nonce: 69,
    gasPrice: ethers.parseUnits("50", "gwei"), // Using 50 gwei to ensure it's higher
  });

  console.log(`Cancellation transaction hash: ${tx.hash}`);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("Nonce 69 cancelled successfully");

  console.log("Pending transaction cancelled");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 