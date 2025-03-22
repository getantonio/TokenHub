const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying improved V4FactoryWithLiquidity (v3 with auto-distribution) with account:", deployer.address);
  
  // Check that we're on the right network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Deploying to Polygon Amoy (chainId: ${chainId})`);
  
  if (chainId !== 80002n) {
    throw new Error("This script is intended to be run on Polygon Amoy (chainId: 80002)");
  }
  
  // Get existing implementation addresses
  console.log("Getting existing implementation addresses...");
  
  // Get token implementation address (deployed in a previous step)
  const tokenImpl = "0x6590e7BF6eDF46C489bA94e57573aa4B23F9a029";
  
  // Get security module implementation address (deployed in a previous step)
  const securityModuleImpl = "0xD2108AeE5457d0520353555fC2a365e75A016EA0";
  
  // Get distribution module implementation address (deployed in a previous step)
  const distributionModuleImpl = "0x244A222Faf3CEf10235fab38F396F9df7e8F39A5";
  
  // Get liquidity module implementation address
  const liquidityModuleImpl = "0xF71b7AC3F2752CF839f451B12e716E6d96f22803";
  
  // Get existing token beacon address
  const tokenBeacon = "0x3b0BA0f31D15Aa9e272181D989EE8059b27E5854";
  
  // Get existing security module beacon address
  const securityModuleBeacon = "0xc236923b1d111759eDC74aB674016D68ccB39ba8";
  
  // Get existing distribution module beacon address
  const distributionModuleBeacon = "0x8035263fB531Cb08fB8f48685524f9A6a36A3622";
  
  // Get existing liquidity module beacon address
  const liquidityModuleBeacon = "0x129e08e2e439378E1cD9AD59138cF5Ea7884eb90";
  
  // Print existing addresses
  console.log("Existing addresses:", {
    tokenImpl,
    securityModuleImpl,
    distributionModuleImpl,
    liquidityModuleImpl,
    tokenBeacon,
    securityModuleBeacon,
    distributionModuleBeacon,
    liquidityModuleBeacon
  });
  
  // Deploy V4FactoryWithLiquidityFixedV3 with the improved implementation
  console.log("Deploying V4FactoryWithLiquidityFixedV3 with auto-distribution...");
  const V4FactoryWithLiquidityFixedV3 = await ethers.getContractFactory("contracts/V4FactoryWithLiquidityFixedV3.sol:V4FactoryWithLiquidityFixedV3");
  const v4Factory = await V4FactoryWithLiquidityFixedV3.deploy(
    deployer.address,
    tokenImpl,
    securityModuleImpl,
    distributionModuleImpl,
    liquidityModuleImpl
  );
  
  await v4Factory.waitForDeployment();
  const factoryAddress = await v4Factory.getAddress();
  console.log("V4FactoryWithLiquidityFixedV3 deployed to:", factoryAddress);
  
  console.log("\nTo verify the factory contract, run:");
  console.log(`npx hardhat verify --network polygonamoy ${factoryAddress} ${deployer.address} ${tokenImpl} ${securityModuleImpl} ${distributionModuleImpl} ${liquidityModuleImpl}`);
  
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 