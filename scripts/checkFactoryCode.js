const { ethers } = require("hardhat");

async function main() {
  // Replace with the address you want to check
  const address = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;

  if (!address) {
    console.error("Please set the NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 environment variable");
    return;
  }

  console.log("Checking contract at address:", address);

  // Get the network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");

  // Try to get the code at the address
  const code = await ethers.provider.getCode(address);
  
  if (code === '0x') {
    console.log("❌ No contract exists at this address");
  } else {
    console.log("✅ Contract found at this address");
    console.log("Code length:", code.length, "bytes");
    
    // Try to get the contract's deployment fee if it's a TokenFactory
    try {
      // Get the contract ABI for TokenFactory_v3_Updated (can be adjusted for other contracts)
      const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
      
      // Attach to the deployed contract
      const factory = await TokenFactory.attach(address);
      
      // Get deployment fee
      const deploymentFee = await factory.deploymentFee();
      console.log("Deployment fee:", ethers.utils.formatEther(deploymentFee), "ETH/MATIC");
      
      // Check if the contract is paused
      const isPaused = await factory.paused();
      console.log("Contract is paused:", isPaused);
      
      // Get the router address
      const routerAddress = await factory.routerAddress();
      console.log("Router address:", routerAddress);
      
      // Get the total tokens created
      const totalTokensCreated = await factory.totalTokensCreated();
      console.log("Total tokens created:", totalTokensCreated.toString());
      
      // Get the owner
      const owner = await factory.owner();
      console.log("Contract owner:", owner);
      
    } catch (error) {
      console.log("Could not interact with contract as TokenFactory:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 