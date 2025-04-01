// Check Factory Owner script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("Checking factory ownership...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x9bAF646fb9fe4c95B51BB78Bb55d06F158b1b779";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  // Get the current owner
  const owner = await factory.owner();
  console.log("\nFactory owner:", owner);
  console.log("Deployer address:", deployer.address);
  console.log("Is deployer owner?", owner.toLowerCase() === deployer.address.toLowerCase());
  
  // If not owner, transfer ownership
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("\nTransferring ownership to deployer...");
    const tx = await factory.transferOwnership(deployer.address);
    await tx.wait();
    console.log("Ownership transferred successfully");
    
    // Verify ownership
    const newOwner = await factory.owner();
    console.log("\nNew factory owner:", newOwner);
    console.log("Is deployer owner?", newOwner.toLowerCase() === deployer.address.toLowerCase());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 