const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // Get the network name and version
  const networkName = network.name;
  const version = 'v1'; // Update this when deploying v2
  
  console.log(`Deploying TokenFactory_v1 to ${networkName}...`);

  // Get the factory fee from environment variables
  const factoryFee = process.env.FACTORY_FEE || "0.0001"; // Default to 0.0001 ETH/MATIC
  const factoryFeeWei = ethers.parseEther(factoryFee);
  
  console.log(`Factory fee set to: ${factoryFee} ${networkName === 'polygon-amoy' ? 'MATIC' : 'ETH'}`);

  // Deploy the factory with fee
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v1");
  const factory = await TokenFactory.deploy(factoryFeeWei);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v1 deployed to: ${address}`);

  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', version, networkName);
  const deploymentInfo = {
    address,
    network: networkName,
    version,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    factoryFee
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

  console.log(`
Deployment completed:
- Network: ${networkName}
- Version: ${version}
- Address: ${address}
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