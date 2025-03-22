const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying fixed V4FactoryWithLiquidity with account:", deployer.address);
  
  // Get network ID to ensure we're on the correct network
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== 80002n) {
    throw new Error(`Expected Polygon Amoy (chainId: 80002), got chainId: ${chainId}`);
  }
  console.log("Deploying to Polygon Amoy (chainId: 80002)");

  // Get existing implementation addresses
  console.log("Getting existing implementation addresses...");

  // Get the existing factory to read implementation addresses
  const existingFactoryAddress = "0xdb45Ac5348e4994B4EDB555EEBe16E621eF8F1D1";
  const existingFactory = await ethers.getContractAt(
    "contracts/V4Factory.sol:V4Factory",
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

  // Deploy the fixed V4FactoryWithLiquidity
  console.log("Deploying V4FactoryWithLiquidity...");
  const V4FactoryWithLiquidity = await ethers.getContractFactory("contracts/V4FactoryWithLiquidity.sol:V4FactoryWithLiquidity");
  const v4Factory = await V4FactoryWithLiquidity.deploy(
    deployer.address,
    addresses[0], // tokenImpl
    addresses[1], // securityModuleImpl
    addresses[2], // distributionModuleImpl
    addresses[3]  // liquidityModuleImpl
  );

  await v4Factory.waitForDeployment();
  const factoryAddress = await v4Factory.getAddress();
  console.log("V4FactoryWithLiquidity deployed to:", factoryAddress);

  // Verify the new factory contract
  console.log(`\nTo verify the factory contract, run:`);
  console.log(`npx hardhat verify --network polygonamoy ${factoryAddress} ${deployer.address} ${addresses[0]} ${addresses[1]} ${addresses[2]} ${addresses[3]}`);

  // Print the environment variable to add
  console.log(`\nAdd this to your .env.local file:`);
  console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 