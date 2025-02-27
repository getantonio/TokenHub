const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get router address based on network
  const networkName = hre.network.name;
  console.log("Network:", networkName);
  
  let uniswapV2Router;
  if (networkName === 'sepolia') {
    uniswapV2Router = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
  } else {
    throw new Error(`Unsupported network: ${networkName}`);
  }
  console.log("Using Uniswap V2 Router:", uniswapV2Router);

  // Deploy TokenTemplate_v3_Enhanced
  console.log("\nDeploying TokenTemplate_v3_Enhanced...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3_Enhanced");
  const tokenTemplate = await TokenTemplate.deploy(uniswapV2Router);
  await tokenTemplate.waitForDeployment();
  const templateAddress = await tokenTemplate.getAddress();
  console.log("TokenTemplate_v3_Enhanced deployed to:", templateAddress);

  // Deploy TokenFactory_v3_Enhanced
  console.log("\nDeploying TokenFactory_v3_Enhanced...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Enhanced");
  const deploymentFee = ethers.parseEther("0.001"); // 0.001 ETH deployment fee
  const tokenFactory = await TokenFactory.deploy(uniswapV2Router, deploymentFee, deployer.address);
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  console.log("TokenFactory_v3_Enhanced deployed to:", factoryAddress);

  // Print deployment info
  console.log("\nDeployment Summary:");
  console.log("- TokenTemplate address:", templateAddress);
  console.log("- TokenFactory address:", factoryAddress);
  console.log("- Uniswap V2 Router:", uniswapV2Router);
  console.log("- Deployment Fee:", ethers.formatEther(deploymentFee), "ETH");
  console.log("- Fee Recipient:", deployer.address);

  // Verify the contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  console.log("Verify TokenTemplate_v3_Enhanced:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${templateAddress} "${uniswapV2Router}"`);
  console.log("\nVerify TokenFactory_v3_Enhanced:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress} "${uniswapV2Router}" "${deploymentFee}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 