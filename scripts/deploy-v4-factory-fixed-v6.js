// Deploy V4FactoryWithLiquidityFixedV6 (with fixed distribution)
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying V4FactoryWithLiquidityFixedV6 (with token distribution fix) with account:", deployer.address);
  
  // Check that we're on the right network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Deploying to network with chainId: ${chainId}`);
  
  // Get existing implementation addresses
  console.log("Getting existing implementation addresses...");
  
  // Define implementation addresses used in previous deployments
  const tokenImpl = "0x6590e7BF6eDF46C489bA94e57573aa4B23F9a029";
  const securityModuleImpl = "0xD2108AeE5457d0520353555fC2a365e75A016EA0";
  const distributionModuleImpl = "0x244A222Faf3CEf10235fab38F396F9df7e8F39A5";
  const liquidityModuleImpl = "0xF71b7AC3F2752CF839f451B12e716E6d96f22803";
  
  console.log("Using implementation addresses:");
  console.log(`Token: ${tokenImpl}`);
  console.log(`Security Module: ${securityModuleImpl}`);
  console.log(`Distribution Module: ${distributionModuleImpl}`);
  console.log(`Liquidity Module: ${liquidityModuleImpl}`);
  
  // Deploy factory with fixed distribution support
  console.log("Deploying V4FactoryWithLiquidityFixedV6...");
  const Factory = await ethers.getContractFactory("V4FactoryWithLiquidityFixedV6");
  const factory = await Factory.deploy(
    deployer.address,
    tokenImpl,
    securityModuleImpl,
    distributionModuleImpl,
    liquidityModuleImpl
  );
  
  // Wait for deployment to be mined
  console.log("Waiting for deployment to be confirmed...");
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("V4FactoryWithLiquidityFixedV6 deployed to:", factoryAddress);
  console.log("");
  console.log("To verify the factory contract:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress} ${deployer.address} ${tokenImpl} ${securityModuleImpl} ${distributionModuleImpl} ${liquidityModuleImpl}`);
  console.log("");
  console.log("Don't forget to update the .env.local file with the new factory address:");
  console.log(`NEXT_PUBLIC_${hre.network.name.toUpperCase()}_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 