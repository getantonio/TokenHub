const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get router address based on network
  const networkName = hre.network.name;
  console.log("Network:", networkName);
  
  let uniswapV2Router;
  if (networkName === 'sepolia') {
    uniswapV2Router = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Uniswap V2 Router on Sepolia
  } else if (networkName === 'opSepolia') {
    uniswapV2Router = "0xB7f907f7A9eBC822a80BD25E224be42Ce0A698A0"; // Uniswap V2 Router on OP Sepolia
  } else if (networkName === 'arbitrumSepolia') {
    uniswapV2Router = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003"; // Uniswap V2 Router on Arbitrum Sepolia
  } else if (networkName === 'polygonAmoy') {
    uniswapV2Router = "0xf5b509bB0909a69B1c207E495f687a596C168E12"; // QuickSwap V2 Router on Polygon Amoy
  } else if (networkName === 'bscTestnet') {
    uniswapV2Router = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"; // PancakeSwap Router on BSC Testnet
  } else {
    throw new Error(`Unsupported network: ${networkName}`);
  }
  console.log("Using router:", uniswapV2Router);

  // Fee collector address
  const FEE_COLLECTOR = "0x10C8c279c6b381156733ec160A89Abb260bfcf0C";
  console.log("Fee collector:", FEE_COLLECTOR);

  // Deploy TokenFactory_v3_Updated_Fixed
  console.log("\nDeploying TokenFactory_v3_Updated_Fixed...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated_Fixed");
  const factory = await TokenFactory.deploy(uniswapV2Router, FEE_COLLECTOR);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v3_Updated_Fixed deployed to:", factoryAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const deploymentFee = await factory.deploymentFee();
  const currentFeeCollector = await factory.feeCollector();
  console.log("Deployment fee:", ethers.formatEther(deploymentFee), "ETH");
  console.log("Fee collector:", currentFeeCollector);

  // Unpause the factory
  console.log("\nUnpausing factory...");
  const unpauseTx = await factory.unpause();
  await unpauseTx.wait();
  console.log("Factory unpaused");

  // Print deployment info
  console.log("\nDeployment Summary:");
  console.log("- Factory address:", factoryAddress);
  console.log("- Router address:", uniswapV2Router);
  console.log("- Fee collector:", FEE_COLLECTOR);
  console.log("- Deployment fee:", ethers.formatEther(deploymentFee), "ETH");

  // Print verification command
  console.log("\nTo verify on Etherscan:");
  console.log(`npx hardhat verify --network ${networkName} ${factoryAddress} ${uniswapV2Router} ${FEE_COLLECTOR}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 