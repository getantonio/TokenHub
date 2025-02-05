import { verifyContractOnEtherscan } from './utils/utils';
const hre = require('hardhat');
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Skip compilation of obsolete contracts
const SKIP_COMPILATION = ['contracts/TokenFactory_v1.0.0.sol', 'contracts/TokenTemplate_v1.0.0.sol', 'contracts/TokenFactory_v2.0.0.sol', 'contracts/TokenTemplate_v2.0.0.sol'];

// Type for deployment verification
interface VerifyArgs {
  address: string;
  constructorArguments?: any[];
}

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

async function deployV1() {
  const { network, ethers } = hre;
  const networkName = network.name;
  const version = 'v1';
  
  console.log(`Deploying TokenFactory_v1 to ${networkName}...`);

  // First deploy the TokenTemplate_v1
  console.log('Deploying TokenTemplate_v1...');
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v1 deployed to: ${templateAddress}`);

  // Deploy the factory with initial fee of 0.0001 ETH
  console.log('Deploying TokenFactory_v1...');
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v1_1_0");
  const factory = await TokenFactory.deploy(templateAddress);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v1 deployed to: ${address}`);

  // Initialize the factory with deployment fee
  console.log('Initializing factory...');
  const deploymentFee = ethers.parseEther(process.env.FACTORY_FEE || "0.0001");
  await factory.initialize(deploymentFee);
  console.log(`TokenFactory_v1 initialized with fee: ${ethers.formatEther(deploymentFee)} ETH`);

  await saveDeployment(networkName, version, address, templateAddress);

  // Verify contracts
  if (network.name !== 'localhost' && network.name !== 'hardhat') {
    try {
      await verifyContractOnEtherscan(templateAddress, []);
      await verifyContractOnEtherscan(address, [templateAddress]);
    } catch (error) {
      console.error('Error verifying contracts:', error);
    }
  }

  return {
    templateAddress,
    factoryAddress: address
  };
}

async function deployV2() {
  const { network } = hre;
  const networkName = network.name;
  const version = 'v2.1.0';
  
  console.log(`Deploying TokenFactory_v2.1.0 to ${networkName}...`);

  // First deploy the TokenTemplate_v2.1.0
  console.log('Deploying TokenTemplate_v2.1.0...');
  const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v2_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v2.1.0 deployed to: ${templateAddress}`);

  // Deploy the factory with template implementation
  console.log('Deploying TokenFactory_v2.1.0...');
  const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v2_1_0");
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

async function deployV3() {
  const { network } = hre;
  const networkName = network.name;
  const version = 'v3.0.0';
  
  console.log(`Deploying TokenFactory_v3.0.0 to ${networkName}...`);

  // First deploy the TokenTemplate_v3.0.0
  console.log('Deploying TokenTemplate_v3.0.0...');
  const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v3_0_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log(`TokenTemplate_v3.0.0 deployed to: ${templateAddress}`);

  // Deploy the factory with template implementation
  console.log('Deploying TokenFactory_v3.0.0...');
  const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v3_0_0");
  const factory = await TokenFactory.deploy(templateAddress);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`TokenFactory_v3.0.0 deployed to: ${address}`);

  // Initialize the factory with deployment fee
  console.log('Initializing factory...');
  const defaultFee = ethers.parseEther("0.0001"); // 0.0001 ETH default fee
  const tx = await factory.initialize(defaultFee);
  await tx.wait();
  console.log(`Factory initialized with default fee: ${ethers.formatEther(defaultFee)} ETH`);

  await saveDeployment(networkName, version, address, templateAddress);

  // Verify contracts
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    console.log('\nVerifying contracts...');
    try {
      await verifyContract(templateAddress, []);
      console.log('Template contract verified');

      await verifyContract(address, [templateAddress]);
      console.log('Factory contract verified');
    } catch (error) {
      console.error('Error verifying contracts:', error);
    }
  }
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
    blockNumber: await hre.ethers.provider.getBlockNumber()
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
  let versionSuffix = '_V3';
  
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

async function deployAndVerify(version: string) {
  const { network } = hre;
  const networkName = network.name;
  console.log(`\nDeploying ${version} to ${networkName}...`);

  let templateAddress, factoryAddress;
  const defaultFee = ethers.parseEther("0.0001");

  switch (version) {
    case 'v1.0.0': {
      // Deploy v1.0.0 template
      console.log('Deploying TokenTemplate_v1.0.0...');
      const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v1_0_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v1.0.0 deployed to: ${templateAddress}`);

      // Deploy v1.0.0 factory
      console.log('Deploying TokenFactory_v1.0.0...');
      const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v1_0_0");
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
      const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v1_1_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v1.1.0 deployed to: ${templateAddress}`);

      // Deploy v1.1.0 factory
      console.log('Deploying TokenFactory_v1.1.0...');
      const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v1_1_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v1.1.0 deployed to: ${factoryAddress}`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, [templateAddress]);
      break;
    }
    case 'v2.0.0': {
      // Deploy v2.0.0 template
      console.log('Deploying TokenTemplate_v2.0.0...');
      const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v2_0_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v2.0.0 deployed to: ${templateAddress}`);

      // Deploy v2.0.0 factory
      console.log('Deploying TokenFactory_v2.0.0...');
      const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v2_0_0");
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
      const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v2_1_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v2.1.0 deployed to: ${templateAddress}`);

      // Deploy v2.1.0 factory
      console.log('Deploying TokenFactory_v2.1.0...');
      const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v2_1_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v2.1.0 deployed to: ${factoryAddress}`);

      await verifyContract(templateAddress);
      await verifyContract(factoryAddress, [templateAddress]);
      break;
    }
    case 'v3.0.0': {
      // Deploy v3.0.0 template
      console.log('Deploying TokenTemplate_v3.0.0...');
      const TokenTemplate = require('hardhat').getContractFactory("TokenTemplate_v3_0_0");
      const template = await TokenTemplate.deploy();
      await template.waitForDeployment();
      templateAddress = await template.getAddress();
      console.log(`TokenTemplate_v3.0.0 deployed to: ${templateAddress}`);

      // Deploy v3.0.0 factory
      console.log('Deploying TokenFactory_v3.0.0...');
      const TokenFactory = require('hardhat').getContractFactory("TokenFactory_v3_0_0");
      const factory = await TokenFactory.deploy(templateAddress);
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log(`TokenFactory_v3.0.0 deployed to: ${factoryAddress}`);

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
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy TokenTemplate_v1
  console.log("Deploying TokenTemplate_v1...");
  const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v1_1_0");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log("TokenTemplate_v1 deployed to:", templateAddress);

  // Deploy TokenFactory_v1
  console.log("Deploying TokenFactory_v1...");
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v1_1_0");
  const factory = await TokenFactory.deploy(templateAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v1 deployed to:", factoryAddress);

  // Initialize factory with deployment fee
  const deploymentFee = hre.ethers.parseEther(process.env.FACTORY_FEE || "0.0001");
  await factory.initialize(deploymentFee);
  console.log("TokenFactory_v1 initialized with fee:", hre.ethers.formatEther(deploymentFee), "ETH");

  // Save deployment addresses
  const network = hre.network.name;
  const envFile = path.join(process.cwd(), '.env.local');
  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';

  const newEnvVars = `
NEXT_PUBLIC_${network.toUpperCase()}_FACTORY_ADDRESS_V1=${factoryAddress}
NEXT_PUBLIC_${network.toUpperCase()}_TOKEN_TEMPLATE_ADDRESS_V1=${templateAddress}
`;

  fs.writeFileSync(envFile, envContent + newEnvVars);
  console.log("Deployment addresses saved to .env.local");

  // Verify contracts if not on a local network
  if (network !== 'localhost' && network !== 'hardhat') {
    console.log("Waiting for block confirmations...");
    await template.deploymentTransaction()?.wait(5);
    await factory.deploymentTransaction()?.wait(5);

    console.log("Verifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: templateAddress,
        constructorArguments: []
      });
      console.log("TokenTemplate_v1 verified");
    } catch (error) {
      console.error("Error verifying TokenTemplate_v1:", error);
    }

    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [templateAddress]
      });
      console.log("TokenFactory_v1 verified");
    } catch (error) {
      console.error("Error verifying TokenFactory_v1:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 