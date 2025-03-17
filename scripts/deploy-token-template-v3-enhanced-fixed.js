// scripts/deploy-token-template-v3-enhanced-fixed.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying TokenTemplate_v3_Enhanced_Fixed...");

  // Get the router address based on the network
  let routerAddress;
  const network = hre.network.name;
  
  if (network === "mainnet") {
    routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router on Ethereum Mainnet
  } else if (network === "sepolia") {
    routerAddress = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Uniswap V2 Router on Sepolia
  } else if (network === "polygon") {
    routerAddress = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router on Polygon
  } else if (network === "arbitrum") {
    routerAddress = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // SushiSwap Router on Arbitrum
  } else if (network === "optimism") {
    routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // Uniswap V3 Router on Optimism
  } else if (network === "base") {
    routerAddress = "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86"; // BaseSwap Router on Base
  } else {
    // Default to Uniswap V2 Router on Ethereum Mainnet
    routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  }

  console.log(`Using router address for ${network}: ${routerAddress}`);

  // Deploy the contract
  const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v3_Enhanced_Fixed");
  const tokenTemplate = await TokenTemplate.deploy(routerAddress);

  await tokenTemplate.deployed();

  console.log(`TokenTemplate_v3_Enhanced_Fixed deployed to: ${tokenTemplate.address}`);
  
  // Verify the contract on Etherscan if not on a local network
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Waiting for block confirmations...");
    // Wait for 6 block confirmations
    await tokenTemplate.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: tokenTemplate.address,
        constructorArguments: [routerAddress],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 