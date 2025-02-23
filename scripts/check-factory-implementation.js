require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  try {
    const factoryAddress = "0xA78aB1a056f15Db7a15859797372c604944F58e6";
    const currentImpl = "0x3a805D7592d8085c81B03e3022e2792E64cEF9AF";
    const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable is not set in .env file");
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Factory ABI - including all relevant functions
    const factoryAbi = [
      "function deploymentFee() external view returns (uint256)",
      "function setDeploymentFee(uint256 _fee) external",
      "function owner() external view returns (address)",
      "function implementation() external view returns (address)",
      "function getUserCreatedTokens(address user) external view returns (address[])",
      "function getTokenCreator(address token) external view returns (address)",
      "function getUserTokenCount(address user) external view returns (uint256)"
    ];

    // Get the factory contract
    const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet);

    // Check basic info
    console.log("Factory Status Check:");
    console.log("--------------------");
    console.log("Factory address:", factoryAddress);
    console.log("Current implementation:", currentImpl);
    
    const owner = await factory.owner();
    console.log("\nOwnership:");
    console.log("Current owner:", owner);
    console.log("Our address:", wallet.address);
    console.log("We are the owner:", owner.toLowerCase() === wallet.address.toLowerCase());

    const deploymentFee = await factory.deploymentFee();
    console.log("\nDeployment Fee:", ethers.formatEther(deploymentFee), "BNB");

    // Check user token info
    const userTokens = await factory.getUserCreatedTokens(wallet.address);
    console.log("\nUser Token Info:");
    console.log("Number of tokens created:", userTokens.length);
    console.log("Token addresses:", userTokens);

    // Set minimal testnet fee
    const minimalFee = ethers.parseEther("0.001"); // 0.001 BNB for testnet
    if (deploymentFee !== minimalFee) {
      console.log("\nUpdating deployment fee to 0.001 BNB...");
      const tx = await factory.setDeploymentFee(minimalFee);
      await tx.wait();
      const newFee = await factory.deploymentFee();
      console.log("New deployment fee:", ethers.formatEther(newFee), "BNB");
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 