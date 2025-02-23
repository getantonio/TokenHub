const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Withdrawing fees with account:", deployer.address);

  // Contract addresses for BSC Testnet
  const FACTORY_ADDRESSES = {
    v1: "0x0000000000000000000000000000000000000000",
    v2: "0x0000000000000000000000000000000000000000",
    v3: "0x8Bd2E8228C277Cc2A72efB62F8Ccc4Fb9Bb3fc51"
  };

  // Process each factory version
  for (const [version, address] of Object.entries(FACTORY_ADDRESSES)) {
    console.log(`\nProcessing ${version.toUpperCase()} factory at ${address}`);
    
    try {
      // Get contract balance
      const balance = await ethers.provider.getBalance(address);
      console.log(`Balance before withdrawal: ${ethers.formatEther(balance)} BNB`);

      if (balance > 0) {
        // Get the appropriate factory contract
        const Factory = await ethers.getContractFactory(`TokenFactory_${version}`);
        const factory = Factory.attach(address);

        // Withdraw fees
        console.log("Withdrawing fees...");
        const tx = await factory.withdrawFees();
        await tx.wait();

        // Verify withdrawal
        const newBalance = await ethers.provider.getBalance(address);
        console.log(`Balance after withdrawal: ${ethers.formatEther(newBalance)} BNB`);
        console.log(`Withdrawn amount: ${ethers.formatEther(balance.sub(newBalance))} BNB`);
      } else {
        console.log("No fees to withdraw");
      }
    } catch (error) {
      console.error(`Error processing ${version.toUpperCase()} factory:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 