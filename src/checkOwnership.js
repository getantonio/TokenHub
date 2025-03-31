require('dotenv').config();
const { ethers } = require('hardhat');
const { LOAN_POOL_FACTORY_ABI } = require('./contracts/defi/abis');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');

async function main() {
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  const expectedOwner = process.env.NEXT_PUBLIC_EXPECTED_OWNER;

  if (!factoryAddress || !expectedOwner) {
    throw new Error('Required environment variables not set');
  }

  const [signer] = await ethers.getSigners();
  console.log('Using signer:', signer.address);

  // Create contract instance
  const factory = new ethers.Contract(
    factoryAddress,
    LOAN_POOL_FACTORY_ABI,
    signer
  );

  try {
    console.log('Checking contract ownership...');
    
    // ABI for simple owner() check
    const ownerABI = [{
      inputs: [],
      name: 'owner',
      outputs: [{ type: 'address', name: '' }],
      stateMutability: 'view',
      type: 'function'
    }];
    
    // Create a client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http()
    });
    
    // Check current owner
    const currentOwner = await publicClient.readContract({
      address: factoryAddress,
      abi: ownerABI,
      functionName: 'owner'
    });
    
    console.log('Current Owner:', currentOwner);
    console.log('Expected Owner:', expectedOwner);
    
    if (currentOwner.toLowerCase() === expectedOwner.toLowerCase()) {
      console.log('✅ Ownership is correct');
    } else {
      console.log('❌ Ownership is incorrect');
      console.log('Please use the current owner to transfer ownership to your address');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 