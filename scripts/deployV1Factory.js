const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of V1 Factory on Polygon Amoy...");
  
  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Get the network details to verify we're on Polygon Amoy
    const network = await ethers.provider.getNetwork();
    console.log("Network:", {
      name: network.name,
      chainId: network.chainId.toString()
    });
    
    // Get the factory contract
    console.log("Compiling contracts...");
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v1");
    const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1");
    
    // First deploy the template
    console.log("Deploying template contract...");
    const template = await TokenTemplate.deploy();
    await template.deploymentTransaction().wait();
    console.log("Template deployed at:", template.target);
    
    // Get fee setting from environment or use default
    const deploymentFee = process.env.DEPLOYMENT_FEE 
      ? ethers.parseUnits(process.env.DEPLOYMENT_FEE, "ether")
      : ethers.parseUnits("0.0001", "ether");
    
    console.log("Using deployment fee:", ethers.formatUnits(deploymentFee, "ether"), "ETH");
    
    // Now deploy the factory with the template address
    console.log("Deploying factory contract...");
    const factory = await TokenFactory.deploy(template.target, deploymentFee);
    await factory.deploymentTransaction().wait();
    
    console.log("Factory deployed at:", factory.target);
    console.log("Transaction hash:", factory.deploymentTransaction().hash);
    
    // Wait for a few seconds to let the blockchain confirm the deployment
    console.log("Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the deployment by reading factory information
    console.log("Verifying deployment...");
    
    const implAddress = await factory.implementationContract();
    const fee = await factory.deploymentFee();
    const owner = await factory.owner();
    
    console.log("Factory verified with details:");
    console.log("  Implementation address:", implAddress);
    console.log("  Deployment fee:", ethers.formatUnits(fee, "ether"), "ETH");
    console.log("  Owner:", owner);
    
    // Save the deployment info to a file
    const deploymentInfo = {
      network: "Polygon Amoy",
      chainId: network.chainId.toString(),
      factoryAddress: factory.target,
      templateAddress: template.target,
      deploymentFee: ethers.formatUnits(fee, "ether"),
      deploymentTx: factory.deploymentTransaction().hash,
      deployDate: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../factory-deployment-info.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to factory-deployment-info.json");
    console.log("");
    console.log("To use this factory in your app:");
    console.log("1. Update your environment variables:");
    console.log(`   NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1=${factory.target}`);
    console.log("2. Restart your application");
    
  } catch (error) {
    console.error("Error deploying factory:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 