const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Withdrawing fees with account:", deployer.address);

  const factoryAddress = "0x3BBba83F62A4bffeC4A46aD390605C27B6FF6D6e";
  const templateAddress = "0x08BCb5E8EF0369a879c4591ea5ADEeCcdAb5fe66";
  
  // Check factory
  const Factory = await ethers.getContractFactory("TokenFactory_v3_Enhanced");
  const factory = Factory.attach(factoryAddress);

  console.log("\nChecking factory:", factoryAddress);
  const factoryBalance = await ethers.provider.getBalance(factoryAddress);
  console.log("Factory balance:", ethers.formatEther(factoryBalance), "ETH");

  if (factoryBalance > 0) {
    console.log("Attempting to withdraw from factory...");
    try {
      const tx = await factory.withdrawStuckETH();
      await tx.wait();
      console.log("Successfully withdrew", ethers.formatEther(factoryBalance), "ETH from factory");
    } catch (error) {
      console.error("Error withdrawing from factory:", error.message);
    }
  }

  // Check template
  const Template = await ethers.getContractFactory("TokenTemplate_v3_Enhanced");
  const template = Template.attach(templateAddress);

  console.log("\nChecking template:", templateAddress);
  const templateBalance = await ethers.provider.getBalance(templateAddress);
  console.log("Template balance:", ethers.formatEther(templateBalance), "ETH");

  if (templateBalance > 0) {
    console.log("Attempting to withdraw from template...");
    try {
      const tx = await template.emergencyWithdraw();
      await tx.wait();
      console.log("Successfully withdrew", ethers.formatEther(templateBalance), "ETH from template");
    } catch (error) {
      console.error("Error withdrawing from template:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 