const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Router address for Sepolia
  const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  // Deploy template first
  console.log("\nDeploying TokenTemplate_v3...");
  const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v3");
  const template = await TokenTemplate.deploy(ROUTER_ADDRESS);
  await template.waitForDeployment();
  const templateAddress = await template.getAddress();
  console.log("TokenTemplate_v3 deployed to:", templateAddress);

  // Deploy factory
  console.log("\nDeploying TokenFactory_v3...");
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v3");
  const factory = await TokenFactory.deploy(ROUTER_ADDRESS);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v3 deployed to:", factoryAddress);

  // Set deployment fee (0.001 ETH)
  console.log("\nSetting deployment fee...");
  const setFeeTx = await factory.setDeploymentFee(hre.ethers.parseEther("0.001"));
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.001 ETH");

  // Verify setup
  const fee = await factory.deploymentFee();
  console.log("\nVerification:");
  console.log("Router Address:", ROUTER_ADDRESS);
  console.log("Template Address:", templateAddress);
  console.log("Factory Address:", factoryAddress);
  console.log("Deployment Fee:", hre.ethers.formatEther(fee), "ETH");

  // Verify contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  try {
    console.log("Verifying template...");
    await hre.run("verify:verify", {
      address: templateAddress,
      constructorArguments: [ROUTER_ADDRESS]
    });
    console.log("Template verified successfully");

    console.log("\nVerifying factory...");
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [ROUTER_ADDRESS]
    });
    console.log("Factory verified successfully");
  } catch (error) {
    console.error("Error verifying contracts:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    router: ROUTER_ADDRESS,
    template: templateAddress,
    factory: factoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join("deployments", "v3", "sepolia");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to:", path.join(deploymentPath, "deployment.json"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 