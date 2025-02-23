// @ts-ignore
import { ethers } from "ethers";

const main = async () => {
  try {
    const factoryAddress = "0xA78aB1a056f15Db7a15859797372c604944F58e6";
    const templateAddress = "0x3a805D7592d8085c81B03e3022e2792E64cEF9AF";
    const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";

    // Create provider and connect to BSC Testnet
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Factory ABI - only the functions we need
    const factoryAbi = [
      "function implementation() external view returns (address)",
      "function deploymentFee() external view returns (uint256)"
    ];

    // Get the factory contract
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Check if the factory is initialized by getting the implementation address
    const implementation = await factory.implementation();
    console.log("Current implementation address:", implementation);
    console.log("Expected implementation address:", templateAddress);
    console.log("Implementation matches:", implementation.toLowerCase() === templateAddress.toLowerCase());

    // Get the deployment fee
    const deploymentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(deploymentFee), "BNB");

  } catch (error) {
    console.error("Error:", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 