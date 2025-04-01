require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const { ethers } = require('hardhat');
const hre = require("hardhat");

// FeeCollector ABI - only the functions we need
const FEE_COLLECTOR_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "authorizedCallers",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_caller", "type": "address" }],
    "name": "authorizeCaller",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log("Starting factory authorization...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x36ef7eB49670b2F262f116Dc9a984667302BF586";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  // Get the fee collector address
  const feeCollectorAddress = await factory.feeCollector();
  console.log("\nFee collector address:", feeCollectorAddress);
  
  // Get the fee collector contract
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = FeeCollector.attach(feeCollectorAddress);
  
  // Check if factory is already authorized
  const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
  console.log("Initial authorization status:", isAuthorized);
  
  if (!isAuthorized) {
    console.log("\nAuthorizing factory...");
    const tx = await feeCollector.authorizeCaller(factoryAddress);
    await tx.wait();
    console.log("Factory authorized successfully");
    
    // Verify authorization
    const finalAuthorized = await feeCollector.authorizedCallers(factoryAddress);
    console.log("Final authorization status:", finalAuthorized);
  } else {
    console.log("\nFactory is already authorized");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 