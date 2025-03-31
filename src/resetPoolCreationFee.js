// This script will reset the pool creation fee to 0.05 ETH
// Run with: node src/resetPoolCreationFee.js

const { createWalletClient, createPublicClient, http, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
require('dotenv').config();
const { ethers } = require('hardhat');
const { LOAN_POOL_FACTORY_ABI, FEE_COLLECTOR_ABI } = require('./contracts/defi/abis');

// FeeCollector ABI - only the function we need to call
const FEE_COLLECTOR_ABI_VIEM = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "newFee", "type": "uint256" }
    ],
    "name": "setPoolCreationFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolCreationFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  if (!process.env.PRIVATE_KEY) {
    console.error("⚠️ Please set your PRIVATE_KEY in the .env.local file");
    process.exit(1);
  }
  
  // Get private key from environment or prompt
  const privateKey = process.env.PRIVATE_KEY;
  console.log("Using account to send transaction");
  
  // Factory and FeeCollector addresses
  const factoryAddress = '0xd61a8De6392750AD9FD250a59Cfa4d55f01CE9a2';
  const feeCollectorAddress = '0x014146631DDF8EEa259FAF22B25d669425Ffc1A0';
  
  // Create wallet client
  const account = privateKeyToAccount(privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });
  
  console.log(`Account address: ${account.address}`);
  console.log(`Fee collector address: ${feeCollectorAddress}`);
  
  try {
    // Get current fee
    console.log("Checking current pool creation fee...");
    let currentFee;
    
    try {
      currentFee = await publicClient.readContract({
        address: feeCollectorAddress,
        abi: FEE_COLLECTOR_ABI,
        functionName: 'getPoolCreationFee'
      });
      console.log(`Current fee: ${currentFee} wei (${Number(currentFee) / 1e18} ETH)`);
    } catch (error) {
      console.error("Failed to read current fee:", error);
      console.log("Assuming fee is 0 and proceeding...");
      currentFee = BigInt(0);
    }
    
    // Calculate new fee (0.05 ETH)
    const newFee = parseEther('0.05');
    console.log(`Setting fee to: ${newFee} wei (0.05 ETH)`);
    
    if (currentFee === newFee) {
      console.log("Fee is already set to 0.05 ETH. No action needed.");
      return;
    }
    
    // Set new fee
    console.log("Submitting transaction to update fee...");
    const hash = await walletClient.writeContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI,
      functionName: 'setPoolCreationFee',
      args: [newFee]
    });
    
    console.log(`Transaction submitted with hash: ${hash}`);
    console.log("Waiting for transaction confirmation...");
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log("✅ Transaction confirmed! Fee has been updated to 0.05 ETH");
      
      // Verify the fee was updated
      try {
        const updatedFee = await publicClient.readContract({
          address: feeCollectorAddress,
          abi: FEE_COLLECTOR_ABI,
          functionName: 'getPoolCreationFee'
        });
        console.log(`Verified new fee: ${updatedFee} wei (${Number(updatedFee) / 1e18} ETH)`);
        
        if (updatedFee !== newFee) {
          console.warn("⚠️ Fee was not updated to the expected value. Please check the contract.");
        }
      } catch (error) {
        console.error("Failed to verify updated fee:", error);
      }
    } else {
      console.error("❌ Transaction failed!");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main(); 