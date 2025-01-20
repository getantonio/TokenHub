const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  try {
    const signers = await ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error("No signers available. Please check your PRIVATE_KEY in .env");
    }
    const deployer = signers[0];
    console.log("Updating fee with account:", deployer.address);

    // Get the deployed contract
    const TokenFactory = await ethers.getContractFactory("TokenFactory", deployer);
    const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
    if (!factoryAddress) {
      throw new Error("TokenFactory address not found in .env");
    }
    const factory = TokenFactory.attach(factoryAddress);

    // Current ETH price in USD (with 8 decimals)
    // As of Feb 2024, ETH is around $3000
    const ethPriceInUsd = 300000000000; // $3000.00000000
    console.log("Using ETH price:", ethPriceInUsd / 100000000, "USD");

    // Update the fee
    console.log("Updating creation fee...");
    const tx = await factory.updateFeeFromEthPrice(ethPriceInUsd);
    console.log("Transaction sent:", tx.hash);
    
    // Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait(2);
    console.log("Fee updated in block:", receipt.blockNumber);

    // Get the new fee
    const newFee = await factory.creationFee();
    console.log("New creation fee:", ethers.formatEther(newFee), "ETH");
    console.log("This is equivalent to $100 USD at current ETH price");
  } catch (error) {
    console.error("\nFee update failed:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nScript failed:");
    console.error(error);
    process.exit(1);
  }); 