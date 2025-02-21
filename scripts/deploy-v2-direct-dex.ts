const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function verifyContract(address: string, constructorArguments: any[] = []) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

async function main() {
  const { network, ethers } = hre;
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  console.log(`Deploying TokenFactory_v2_DirectDEX to ${networkName}...`);
  console.log("Deploying with account:", deployer.address);

  // First deploy the TokenTemplate_v2DirectDEX
  console.log('Deploying TokenTemplate_v2DirectDEX...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2DirectDEX");
  const template = await TokenTemplate.deploy(
    "Test Token", // name
    "TEST", // symbol
    ethers.parseEther("1000000"), // totalSupply
    ethers.parseEther("10000"), // maxTxAmount
    ethers.parseEther("20000"), // maxWalletAmount
    false, // enableTrading
    Math.floor(Date.now() / 1000) + 300, // tradingStartTime (5 minutes from now)
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router on Sepolia
    2, // marketingFeePercentage
    1, // developmentFeePercentage
    2, // autoLiquidityFeePercentage
    deployer.address, // marketingWallet
    deployer.address, // developmentWallet
    deployer.address, // autoLiquidityWallet
    true, // enableBuyFees
    true // enableSellFees
  );
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v2DirectDEX deployed to: ${templateAddress}`);

  // Deploy the DEX Listing Factory
  console.log('Deploying TokenFactory_v2_DirectDEX_TwoStep...');
  const TokenFactoryTwoStep = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
  const listingFee = ethers.parseEther("0.01"); // 0.01 ETH listing fee
  const twoStepFactory = await TokenFactoryTwoStep.deploy(listingFee);
  await twoStepFactory.waitForDeployment();
  const twoStepFactoryAddress = await twoStepFactory.getAddress();
  console.log(`TokenFactory_v2_DirectDEX_TwoStep deployed to: ${twoStepFactoryAddress}`);

  /* Commenting out DEX addition for now
  // Add Uniswap V2 as supported DEX
  console.log('Adding Uniswap V2 as supported DEX...');
  const addDexTx = await twoStepFactory.addDEX(
    "uniswap-test",
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    {
      gasLimit: 500000,
      maxFeePerGas: ethers.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    }
  );
  await addDexTx.wait();
  console.log('Uniswap V2 added as supported DEX');

  // Verify DEX configuration
  const dexInfo = await twoStepFactory.getDEXRouter("uniswap-test");
  console.log('DEX Configuration:', {
    name: "uniswap-test",
    router: dexInfo.router,
    isActive: dexInfo.isActive
  });
  */

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'v2-direct-dex', networkName);
  const deploymentInfo = {
    templateAddress,
    twoStepFactoryAddress,
    network: networkName,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  // Save deployment info to JSON file
  fs.writeFileSync(
    path.join(deploymentPath, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update .env.local with the new addresses
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('No existing .env.local file, creating new one');
  }

  // Add or update environment variables
  const envVars = {
    [`NEXT_PUBLIC_${networkName.toUpperCase()}_DEX_LISTING_FACTORY_ADDRESS`]: twoStepFactoryAddress,
    [`NEXT_PUBLIC_${networkName.toUpperCase()}_DEX_LISTING_TEMPLATE_ADDRESS`]: templateAddress
  };

  Object.entries(envVars).forEach(([key, value]) => {
    const envLine = `${key}=${value}`;
    if (envContent.includes(key)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), envLine);
    } else {
      envContent += `\n${envLine}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log(`
Deployment completed:
- Network: ${networkName}
- DEX Listing Template Address: ${templateAddress}
- DEX Listing Factory Address: ${twoStepFactoryAddress}
- Saved to: ${deploymentPath}/deployment.json
- Updated .env.local
`);

  // Verify contracts
  if (network.name !== 'localhost' && network.name !== 'hardhat') {
    try {
      console.log('\nVerifying contracts...');
      // Wait for a few blocks before verification
      console.log('Waiting for 5 blocks before verification...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

      await verifyContract(templateAddress, []);
      await verifyContract(twoStepFactoryAddress, [listingFee]);
    } catch (error) {
      console.error('Error verifying contracts:', error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 