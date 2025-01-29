const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // Get the network name and version
  const networkName = network.name;
  const version = 'v2.1.0'; // Updated to v2.1.0
  
  console.log(`Deploying TokenFactory_v2.1.0 to ${networkName}...`);

  // First deploy the TokenTemplate_v2.1.0
  console.log('Deploying TokenTemplate_v2.1.0...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v2.1.0 deployed to: ${templateAddress}`);

  // Deploy the factory with template implementation
  console.log('Deploying TokenFactory_v2.1.0...');
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_1_0");
  const factory = await TokenFactory.deploy(templateAddress);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v2.1.0 deployed to: ${address}`);

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', version, networkName);
  const deploymentInfo = {
    factoryAddress: address,
    templateAddress,
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

  // Update .env.local with the new addresses
  const factoryEnvKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_FACTORY_ADDRESS_V2`;
  const templateEnvKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_TOKEN_TEMPLATE_ADDRESS_V2`;
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('No existing .env.local file, creating new one');
  }

  // Replace or add the new addresses
  const factoryEnvLine = `${factoryEnvKey}=${address}`;
  const templateEnvLine = `${templateEnvKey}=${templateAddress}`;

  if (envContent.includes(factoryEnvKey)) {
    envContent = envContent.replace(new RegExp(`${factoryEnvKey}=.*`), factoryEnvLine);
  } else {
    envContent += `\n${factoryEnvLine}`;
  }

  if (envContent.includes(templateEnvKey)) {
    envContent = envContent.replace(new RegExp(`${templateEnvKey}=.*`), templateEnvLine);
  } else {
    envContent += `\n${templateEnvLine}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log(`
Deployment completed:
- Network: ${networkName}
- Version: ${version}
- Factory Address: ${address}
- Template Address: ${templateAddress}
- Saved to: ${deploymentPath}/deployment.json
- Updated .env.local with ${factoryEnvKey} and ${templateEnvKey}
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });