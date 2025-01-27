const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // Get the network name and version
  const networkName = network.name;
  const version = 'v1.1.0';
  
  console.log(`Deploying TokenTemplate_v1.1.0 and TokenFactory_v1.1.0 to ${networkName}...`);

  // First deploy the template implementation
  console.log('Deploying template implementation...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v1.1.0 deployed to: ${templateAddress}`);

  // Deploy the factory with template address
  console.log('Deploying factory...');
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v1_1_0");
  const factory = await TokenFactory.deploy(templateAddress);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v1.1.0 deployed to: ${address}`);

  // Initialize the factory
  await factory.initialize();
  console.log("Factory initialized");

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', version, networkName);
  const deploymentInfo = {
    templateAddress,
    factoryAddress: address,
    network: networkName,
    version,
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

  // Update .env.local with the new address
  const envKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_FACTORY_ADDRESS_V1`;
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('No existing .env.local file, creating new one');
  }

  // Replace or add the new address
  const envLine = `${envKey}=${address}`;
  if (envContent.includes(envKey)) {
    envContent = envContent.replace(new RegExp(`${envKey}=.*`), envLine);
  } else {
    envContent += `\n${envKey}=${address}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  // Verify contracts if not on a local network
  if (!['localhost', 'hardhat'].includes(networkName)) {
    console.log('\nVerifying contracts...');
    const hre = require("hardhat");
    
    // Verify template implementation
    await hre.run("verify:verify", {
      address: templateAddress,
      constructorArguments: []
    });

    // Verify factory
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [templateAddress]
    });
  }

  console.log(`
Deployment completed:
- Network: ${networkName}
- Version: ${version}
- Template Implementation: ${templateAddress}
- Factory: ${address}
- Saved to: ${deploymentPath}/deployment.json
- Updated .env.local with ${envKey}
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 