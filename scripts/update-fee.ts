const { ethers } = require("hardhat");
const TokenFactoryV3ABI = require("../src/contracts/abi/TokenFactory_v3.json");

async function main() {
  try {
    console.log("Starting deployment fee update script...");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const provider = ethers.provider;
    const balance = await provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "BNB");

    // Get the factory contract
    const factoryAddress = "0x7DF7be22ad87147dcDD63c18dd33B271364EFe67"; // BSC testnet V3 factory
    console.log("Using factory address:", factoryAddress);

    const factory = new ethers.Contract(factoryAddress, TokenFactoryV3ABI.abi, deployer);
    console.log("Contract attached");

    // Unpause the contract first
    console.log("Unpausing contract...");
    const unpauseTx = await factory.unpause({
      gasLimit: 200000,
      gasPrice: ethers.parseUnits("10", "gwei")
    });
    console.log("Unpause transaction hash:", unpauseTx.hash);
    await unpauseTx.wait();
    console.log("Contract unpaused");

    // Get current fee
    const currentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(currentFee), "BNB");

    // Set new fee to 0.001 BNB
    const newFee = ethers.parseEther("0.001");
    console.log("Setting new fee to:", ethers.formatEther(newFee), "BNB");

    const tx = await factory.setDeploymentFee(newFee, {
      gasLimit: 200000,
      gasPrice: ethers.parseUnits("10", "gwei")
    });
    console.log("Update fee transaction hash:", tx.hash);

    // Wait for transaction to be mined
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Verify new fee
    const updatedFee = await factory.deploymentFee();
    console.log("New deployment fee:", ethers.formatEther(updatedFee), "BNB");

  } catch (error) {
    console.error("Error details:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main:", error);
    process.exit(1);
  }); 