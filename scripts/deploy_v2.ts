const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { verifyContract } = require('./utils');

async function main() {
  const { ethers, network } = hre;
  // Get the network name and version
  const networkName = network.name;
  const version = 'v2.1.0';
  
  console.log(`Deploying TokenTemplate_v2.1.0 and TokenFactory_v2.1.0 to ${networkName}...`);

  // First deploy the template implementation
  console.log('Deploying template implementation...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v2.1.0 deployed to: ${templateAddress}`);

  // Deploy factory implementation
  console.log('Deploying factory implementation...');
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_1_0");
  const factoryImpl = await TokenFactory.deploy(templateAddress);
  await factoryImpl.waitForDeployment();
  const factoryImplAddress = await factoryImpl.getAddress();

  // Deploy proxy with initialization
  console.log('Deploying factory proxy...');
  const initData = factoryImpl.interface.encodeFunctionData("initialize");
  const Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await Proxy.deploy(factoryImplAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  console.log(`TokenFactory_v2.1.0 proxy deployed to: ${proxyAddress}`);

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', version, networkName);
  const deploymentInfo = {
    templateAddress,
    factoryImplAddress,
    proxyAddress,
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
  const envKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_FACTORY_ADDRESS_V2`;
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('No existing .env.local file, creating new one');
  }

  // Replace or add the new address
  const envLine = `${envKey}=${proxyAddress}`;
  if (envContent.includes(envKey)) {
    envContent = envContent.replace(new RegExp(`${envKey}=.*`), envLine);
  } else {
    envContent += `\n${envKey}=${proxyAddress}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  // Verify contracts if not on a local network
  if (!['localhost', 'hardhat'].includes(networkName)) {
    console.log('\nVerifying contracts...');
    
    // Verify template implementation
    await verifyContract(templateAddress);
    
    // Verify factory implementation
    await verifyContract(factoryImplAddress, [templateAddress]);
    
    // Verify proxy
    await verifyContract(proxyAddress, [factoryImplAddress, initData]);
  }

  console.log(`
Deployment completed:
- Network: ${networkName}
- Version: ${version}
- Template Implementation: ${templateAddress}
- Factory Implementation: ${factoryImplAddress}
- Factory Proxy: ${proxyAddress}
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