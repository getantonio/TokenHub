const { ethers } = require("ethers");

async function main() {
  try {
    const factoryAddress = "0x9df49990d25dF8c5c2948DAf7d1Ff95700f970d9";
    const templateAddress = "0x3a805D7592d8085c81B03e3022e2792E64cEF9AF";
    const rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";

    // Create provider and connect to BSC Testnet
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // ERC1967 implementation slot
    const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

    // Get the implementation address directly from storage
    const implementation = await provider.getStorage(factoryAddress, IMPLEMENTATION_SLOT);
    const implementationAddress = ethers.getAddress("0x" + implementation.slice(-40));
    console.log("Current implementation address:", implementationAddress);
    console.log("Expected implementation address:", templateAddress);
    console.log("Implementation matches:", implementationAddress.toLowerCase() === templateAddress.toLowerCase());

    // Factory ABI - only the functions we need
    const factoryAbi = [
      "function deploymentFee() external view returns (uint256)"
    ];

    // Get the factory contract
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Get the deployment fee
    const deploymentFee = await factory.deploymentFee();
    console.log("Current deployment fee:", ethers.formatEther(deploymentFee), "BNB");

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