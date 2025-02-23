const { ethers } = require("ethers");

async function main() {
  try {
    const factoryAddress = "0xA78aB1a056f15Db7a15859797372c604944F58e6";
    const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";

    // Create provider and connect to BSC Testnet
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Factory ABI - only the functions we need
    const factoryAbi = [
      "function owner() external view returns (address)"
    ];

    // Get the factory contract
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Get the owner
    const owner = await factory.owner();
    console.log("Factory owner:", owner);

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