import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";

// Access hardhat runtime environment
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get current nonce
  const startNonce = await deployer.getNonce();
  console.log("Starting deployment with nonce:", startNonce);

  // Deploy TokenTemplate_v3
  console.log("Deploying TokenTemplate_v3...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
  const tokenTemplate = await TokenTemplate.deploy({
    nonce: startNonce,
    gasPrice: ethers.parseUnits("3", "gwei") // BSC typically uses lower gas prices
  });

  await tokenTemplate.waitForDeployment();
  console.log("TokenTemplate_v3 deployed to:", await tokenTemplate.getAddress());

  // Deploy TokenFactory_v3
  console.log("Deploying TokenFactory_v3...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const tokenFactory = await TokenFactory.deploy({
    nonce: startNonce + 1,
    gasPrice: ethers.parseUnits("3", "gwei")
  });

  await tokenFactory.waitForDeployment();
  console.log("TokenFactory_v3 deployed to:", await tokenFactory.getAddress());

  // Initialize the factory
  console.log("Initializing TokenFactory_v3...");
  const initTx = await tokenFactory.initialize(await tokenTemplate.getAddress(), {
    nonce: startNonce + 2,
    gasPrice: ethers.parseUnits("3", "gwei")
  });
  await initTx.wait();
  console.log("TokenFactory_v3 initialized");

  // Set deployment fee to 0.005 BNB
  console.log("Setting deployment fee...");
  const setFeeTx = await tokenFactory.setDeploymentFee(ethers.parseEther("0.005"), {
    nonce: startNonce + 3,
    gasPrice: ethers.parseUnits("3", "gwei")
  });
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.005 BNB");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenTemplate_v3:", await tokenTemplate.getAddress());
  console.log("TokenFactory_v3:", await tokenFactory.getAddress());

  // Verify contracts on BSCScan
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\nVerifying contracts on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: await tokenTemplate.getAddress(),
        contract: "contracts/TokenTemplate_v3.sol:TokenTemplate_v3"
      });
      console.log("TokenTemplate_v3 verified");

      await hre.run("verify:verify", {
        address: await tokenFactory.getAddress(),
        contract: "contracts/TokenFactory_v3.sol:TokenFactory_v3"
      });
      console.log("TokenFactory_v3 verified");
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 