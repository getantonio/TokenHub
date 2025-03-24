const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying V7 Factory with getUserTokens function with account:", deployer.address);
  
  // Get network ID to ensure we're on the correct network
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== 80002n) {
    throw new Error(`Expected Polygon Amoy (chainId: 80002), got chainId: ${chainId}`);
  }
  console.log("Deploying to Polygon Amoy (chainId: 80002)");

  // Get existing implementation addresses from V6 factory
  console.log("Getting existing implementation addresses...");

  // Get the existing V6 factory to read implementation addresses
  const existingFactoryAddress = "0xe175397FA8D3494Ad5986cb2A2C5622AD473fB3B"; // V6 factory
  const existingFactory = await ethers.getContractAt(
    "contracts/V4FactoryWithLiquidityFixedV6.sol:V4FactoryWithLiquidityFixedV6",
    existingFactoryAddress
  );

  const addresses = await existingFactory.getAddresses();
  console.log("Existing addresses:", {
    tokenImpl: addresses[0],
    securityModuleImpl: addresses[1],
    distributionModuleImpl: addresses[2],
    liquidityModuleImpl: addresses[3],
    tokenBeacon: addresses[4],
    securityModuleBeacon: addresses[5],
    distributionModuleBeacon: addresses[6],
    liquidityModuleBeacon: addresses[7]
  });

  // Deploy the new V7 Factory with token tracking functions
  console.log("Deploying V4FactoryWithLiquidityFixedV7...");
  const V4FactoryWithLiquidityFixedV7 = await ethers.getContractFactory(
    "contracts/V4FactoryWithLiquidityFixedV7.sol:V4FactoryWithLiquidityFixedV7"
  );
  
  const v7Factory = await V4FactoryWithLiquidityFixedV7.deploy(
    deployer.address,
    addresses[0], // tokenImpl
    addresses[1], // securityModuleImpl
    addresses[2], // distributionModuleImpl
    addresses[3]  // liquidityModuleImpl
  );

  await v7Factory.waitForDeployment();
  const factoryAddress = await v7Factory.getAddress();
  console.log("V4FactoryWithLiquidityFixedV7 deployed to:", factoryAddress);

  // Verify the new factory contract
  console.log(`\nTo verify the factory contract, run:`);
  console.log(`npx hardhat verify --network polygonamoy ${factoryAddress} ${deployer.address} ${addresses[0]} ${addresses[1]} ${addresses[2]} ${addresses[3]}`);

  // Print the environment variable to add
  console.log(`\nAdd this to your .env.local file:`);
  console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 