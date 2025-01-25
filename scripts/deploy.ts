const hardhat = require("hardhat");

// Configuration
const CONFIG = {
  version: "v1",
  contractName: "TokenFactory_v1",
  initialFee: "0.0001", // ETH - Matches FACTORY_FEE in .env
  verify: true
} as const;

async function main() {
  console.log(`Deploying ${CONFIG.contractName}...`);

  // Deploy with configured fee
  const deploymentFee = hardhat.ethers.parseEther(CONFIG.initialFee);
  
  const TokenFactory = await hardhat.ethers.getContractFactory(CONFIG.contractName);
  const factory = await TokenFactory.deploy(deploymentFee);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`\n${CONFIG.contractName} deployed successfully:`);
  console.log(`Address: ${address}`);
  console.log(`Initial fee: ${CONFIG.initialFee} ETH`);
  console.log(`Version: ${CONFIG.version}`);

  if (CONFIG.verify) {
    console.log("\nVerifying contract on Etherscan...");
    try {
      // Delay verification to ensure the contract is deployed
      await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second delay
      await hardhat.run("verify:verify", {
        address: address,
        constructorArguments: [deploymentFee],
      });
      console.log("Verification successful!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn("Verification failed:", error.message);
      } else {
        console.warn("Verification failed with unknown error");
      }
      console.log("You can try verifying manually later");
    }
  }

  // Output environment variables
  console.log("\nAdd these to your .env.local:");
  console.log(`NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_${CONFIG.version.toUpperCase()}=${address}`);
  console.log(`NEXT_PUBLIC_FACTORY_VERSION=${CONFIG.version}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 