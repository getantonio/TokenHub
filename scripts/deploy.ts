const { ethers, network, run } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Skip compilation of obsolete contracts
const SKIP_COMPILATION = ['contracts/TokenFactory_v1.0.0.sol', 'contracts/TokenTemplate_v1.0.0.sol', 'contracts/TokenFactory_v2.0.0.sol', 'contracts/TokenTemplate_v2.0.0.sol'];

// Type for deployment verification
type VerifyArgs = {
  address: string;
  constructorArguments?: any[];
};

async function deployV1() {
  const networkName = network.name;
  const version = 'v1';
  
  console.log(`Deploying TokenFactory_v1 to ${networkName}...`);

  // First deploy the TokenTemplate_v1
  console.log('Deploying TokenTemplate_v1...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v1 deployed to: ${templateAddress}`);

  // Deploy the factory with initial fee of 0.0001 ETH
  console.log('Deploying TokenFactory_v1...');
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v1");
  const factory = await TokenFactory.deploy(ethers.parseEther("0.0001"));
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v1 deployed to: ${address}`);

  await saveDeployment(networkName, version, address, templateAddress);
}

async function deployV2() {
  const networkName = network.name;
  const version = 'v2.1.0';
  
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

  // Initialize the factory with deployment fee through proxy
  console.log('Initializing factory...');
  const defaultFee = ethers.parseEther("0.0001"); // 0.0001 ETH default fee
  const initData = factory.interface.encodeFunctionData("initialize", [defaultFee]);
  const tx = await factory.initialize(defaultFee);
  await tx.wait();
  console.log(`Factory initialized with default fee: ${ethers.formatEther(defaultFee)} ETH`);

  await saveDeployment(networkName, version, address, templateAddress);
}

async function saveDeployment(networkName: string, version: string, factoryAddress: string, templateAddress: string) {
  // Save deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', version, networkName);
  const deploymentInfo = {
    factoryAddress,
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
  const versionSuffix = version === 'v1' ? '_V1' : '_V2';
  const factoryEnvKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_FACTORY_ADDRESS${versionSuffix}`;
  const templateEnvKey = `NEXT_PUBLIC_${networkName.toUpperCase().replace(/-/g, '_')}_TOKEN_TEMPLATE_ADDRESS${versionSuffix}`;
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('No existing .env.local file, creating new one');
  }

  // Replace or add the new addresses
  const factoryEnvLine = `${factoryEnvKey}=${factoryAddress}`;
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
- Factory Address: ${factoryAddress}
- Template Address: ${templateAddress}
- Saved to: ${deploymentPath}/deployment.json
- Updated .env.local with ${factoryEnvKey} and ${templateEnvKey}
  `);
}

async function verifyContract(address: string, constructorArguments: any[] = []) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments
    });
    console.log(`Verified contract at ${address}`);
  } catch (error) {
    console.log(`Verification failed for ${address}:`, error);
  }
}

async function deployAndVerify(version: string) {
  const networkName = network.name;
  console.log(`\nDeploying ${version} to ${networkName}...`);

  let templateAddress, factoryAddress;
  const defaultFee = ethers.parseEther("0.0001");

  switch (version) {
    case 'v1.0.0': {
      // Deploy v1.0.0 template
      console.log('Deploying TokenTemplate_v1.0.0...');
      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_0_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v1.0.0 deployed to: ${templateAddress}`);

      // Deploy v1.0.0 factory
      console.log('Deploying TokenFactory_v1.0.0...');
      const TokenFactory = await ethers.getContractFactory("TokenFactory_v1_0_0");
      const factory = await TokenFactory.deploy();
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v1.0.0 deployed to: ${factoryAddress}`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, []);
      break;
    }
    case 'v1.1.0': {
      // Deploy v1.1.0 template
      console.log('Deploying TokenTemplate_v1.1.0...');
      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_1_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v1.1.0 deployed to: ${templateAddress}`);

      // Deploy v1.1.0 factory
      console.log('Deploying TokenFactory_v1.1.0...');
      const TokenFactory = await ethers.getContractFactory("TokenFactory_v1_1_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v1.1.0 deployed to: ${factoryAddress}`);

      // Initialize factory
      console.log('Initializing factory...');
      const initTx = await factory.initialize(defaultFee);
      await initTx.wait();
      console.log(`Factory initialized with default fee: ${ethers.formatEther(defaultFee)} ETH`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, [templateAddress]);
      break;
    }
    case 'v2.0.0': {
      // Deploy v2.0.0 template
      console.log('Deploying TokenTemplate_v2.0.0...');
      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2_0_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v2.0.0 deployed to: ${templateAddress}`);

      // Deploy v2.0.0 factory
      console.log('Deploying TokenFactory_v2.0.0...');
      const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_0_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v2.0.0 deployed to: ${factoryAddress}`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, [templateAddress]);
      break;
    }
    case 'v2.1.0': {
      // Deploy v2.1.0 template
      console.log('Deploying TokenTemplate_v2.1.0...');
      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2_1_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v2.1.0 deployed to: ${templateAddress}`);

      // Deploy v2.1.0 factory
      console.log('Deploying TokenFactory_v2.1.0...');
      const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_1_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v2.1.0 deployed to: ${factoryAddress}`);

      // Initialize factory
      console.log('Initializing factory...');
      await factory.initialize(defaultFee);
      console.log(`Factory initialized with default fee: ${ethers.formatEther(defaultFee)} ETH`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, [templateAddress]);
      break;
    }
    default:
      throw new Error(`Unsupported version: ${version}`);
  }

  await saveDeployment(networkName, version, factoryAddress, templateAddress);
}

async function main() {
  // Deploy v2.1.0 with proper initialization
  await deployAndVerify('v2.1.0');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });