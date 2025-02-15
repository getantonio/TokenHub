import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomicfoundation/hardhat-ethers";

async function main(hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get current nonce
  const startNonce = await deployer.getNonce();
  console.log("Starting deployment with nonce:", startNonce);

  // Deploy TokenTemplate_v2DirectDEX
  console.log("Deploying TokenTemplate_v2DirectDEX...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2DirectDEX");
  const tokenTemplate = await TokenTemplate.deploy(
    "Test Token", // name
    "TEST", // symbol
    ethers.parseEther("1000000"), // totalSupply
    ethers.parseEther("10000"), // maxTxAmount
    ethers.parseEther("20000"), // maxWalletAmount
    true, // enableTrading
    0, // tradingStartTime (0 for immediate)
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
    5, // buyTaxPercentage
    5, // sellTaxPercentage
    {
      nonce: startNonce,
      gasPrice: ethers.parseUnits("35", "gwei")
    }
  );

  await tokenTemplate.waitForDeployment();
  const templateAddress = await tokenTemplate.getAddress();
  console.log("TokenTemplate_v2DirectDEX deployed to:", templateAddress);

  // Deploy TokenFactory_v2_DirectDEX
  console.log("Deploying TokenFactory_v2_DirectDEX...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
  const listingFee = ethers.parseEther("0.0001"); // 0.0001 ETH listing fee
  const tokenFactory = await TokenFactory.deploy(listingFee, {
    nonce: startNonce + 1,
    gasPrice: ethers.parseUnits("35", "gwei")
  });

  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  console.log("TokenFactory_v2_DirectDEX deployed to:", factoryAddress);

  // Add supported DEXes
  console.log("Adding supported DEXes...");
  
  // Uniswap V2 Router addresses
  const dexRouters = {
    'uniswap-test': {
      name: 'Uniswap (Sepolia)',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    },
    'pancakeswap-test': {
      name: 'PancakeSwap (BSC Testnet)',
      router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
    }
  };

  for (const [key, dex] of Object.entries(dexRouters)) {
    console.log(`Adding ${dex.name}...`);
    const tx = await tokenFactory.addDEX(key, dex.router, {
      gasPrice: ethers.parseUnits("35", "gwei")
    });
    await tx.wait();
    console.log(`Added ${dex.name} with router ${dex.router}`);
  }

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenTemplate_v2DirectDEX:", templateAddress);
  console.log("TokenFactory_v2_DirectDEX:", factoryAddress);
  console.log("Listing Fee:", ethers.formatEther(listingFee), "ETH");
}

main(hre)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 