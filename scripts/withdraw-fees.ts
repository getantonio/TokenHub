const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Withdrawing fees with account:", deployer.address);

  // Contract addresses
  const factoryAddresses = [
    "0x9A3C81bF993701250d35072182E58c3A35F30239", // Current factory
    "0x61bd5538a41E42B6EDd88b71f056521Aa4b27671"  // Previous factory
  ];

  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_clone");

  for (const factoryAddress of factoryAddresses) {
    console.log(`\nProcessing factory at ${factoryAddress}`);
    const factory = TokenFactory.attach(factoryAddress);

    try {
      // Get contract balance before withdrawal
      const balanceBefore = await ethers.provider.getBalance(factoryAddress);
      console.log("Contract balance before withdrawal:", ethers.formatEther(balanceBefore), "ETH");

      if (balanceBefore > 0) {
        // Withdraw fees
        const tx = await factory.withdrawFees();
        console.log("Withdrawal transaction hash:", tx.hash);

        // Wait for transaction to be mined
        console.log("Waiting for transaction confirmation...");
        await tx.wait();

        // Get contract balance after withdrawal
        const balanceAfter = await ethers.provider.getBalance(factoryAddress);
        console.log("Contract balance after withdrawal:", ethers.formatEther(balanceAfter), "ETH");
        console.log("Withdrawn amount:", ethers.formatEther(balanceBefore - balanceAfter), "ETH");
      } else {
        console.log("No balance to withdraw");
      }

    } catch (error) {
      console.error("Error withdrawing fees from", factoryAddress, ":", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 