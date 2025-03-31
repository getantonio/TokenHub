require('dotenv').config();
const { ethers } = require('hardhat');
const { LOAN_POOL_FACTORY_ABI, FEE_COLLECTOR_ABI } = require('./contracts/defi/abis');
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

// FeeCollector ABI
const FEE_COLLECTOR_ABI_VIEM = [
  {
    "inputs": [],
    "name": "poolCreationFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// LoanPoolFactory ABI
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "feeCollector",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  const feeCollectorAddress = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS;

  if (!factoryAddress || !feeCollectorAddress) {
    throw new Error('Required environment variables not set');
  }

  const [signer] = await ethers.getSigners();
  console.log('Using signer:', signer.address);

  // Create contract instances
  const factory = new ethers.Contract(
    factoryAddress,
    LOAN_POOL_FACTORY_ABI,
    signer
  );

  const feeCollector = new ethers.Contract(
    feeCollectorAddress,
    FEE_COLLECTOR_ABI,
    signer
  );

  console.log('Checking factory and fee collector state...');
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });
  
  try {
    // Get fee collector address from factory
    console.log('\nStep 1: Fetching fee collector address from factory');
    const feeCollectorAddressFromFactory = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'feeCollector'
    });
    console.log('Fee collector address:', feeCollectorAddressFromFactory);
    
    // Check factory owner
    const factoryOwner = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'owner'
    });
    console.log('Factory owner:', factoryOwner);
    
    // Check fee collector settings
    console.log('\nStep 2: Checking fee collector state');
    const poolCreationFee = await publicClient.readContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI_VIEM,
      functionName: 'poolCreationFee'
    });
    console.log('Pool creation fee:', poolCreationFee.toString(), 'wei');
    console.log('Pool creation fee in ETH:', Number(poolCreationFee) / 1e18, 'ETH');
    
    // Check fee collector owner
    const feeCollectorOwner = await publicClient.readContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI_VIEM,
      functionName: 'owner'
    });
    console.log('Fee collector owner:', feeCollectorOwner);
    
    // Check treasury address
    const treasuryAddress = await publicClient.readContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI_VIEM,
      functionName: 'treasury'
    });
    console.log('Treasury address:', treasuryAddress);
    
    // Check the factory bytecode to verify it's a valid contract
    console.log('\nStep 3: Checking factory contract bytecode');
    const factoryBytecode = await publicClient.getBytecode({ address: factoryAddress });
    if (factoryBytecode && factoryBytecode !== '0x') {
      console.log('Factory contract has valid bytecode');
    } else {
      console.error('Factory contract has no bytecode or invalid address');
    }
    
    // Check if the factory and fee collector owners match
    console.log('\nStep 4: Validation checks');
    if (factoryOwner === feeCollectorOwner) {
      console.log('✅ Factory and fee collector have the same owner');
    } else {
      console.warn('⚠️ Factory and fee collector have different owners!');
      console.log(`   Factory owner: ${factoryOwner}`);
      console.log(`   Fee collector owner: ${feeCollectorOwner}`);
    }
    
    // Verify pool creation fee is reasonable
    if (Number(poolCreationFee) === 50000000000000000) { // 0.05 ETH
      console.log('✅ Pool creation fee is set to the expected 0.05 ETH');
    } else {
      console.warn(`⚠️ Pool creation fee is set to ${Number(poolCreationFee) / 1e18} ETH, which is not the expected 0.05 ETH`);
    }
    
    console.log('\nDiagnosis:');
    if (factoryOwner !== '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F') {
      console.log('🔴 The factory owner in the contract does not match your wallet address!');
      console.log('   This is likely why your transactions are failing with "Ownable: caller is not the owner"');
      console.log('   You need to use the correct owner account to call createLendingPool');
    } else {
      console.log('✅ Factory owner matches your wallet address');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 