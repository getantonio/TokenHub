require('dotenv').config();
const { createPublicClient, http, parseEther } = require('viem');
const { sepolia } = require('viem/chains');
const { ethers } = require('hardhat');
const { LOAN_POOL_FACTORY_ABI } = require('./contracts/defi/abis');

// Minimal ABIs for checking
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeCollector",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "implementation",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_asset", "type": "address" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_symbol", "type": "string" },
      { "internalType": "uint256", "name": "_collateralFactorBps", "type": "uint256" },
      { "internalType": "uint256", "name": "_reserveFactorBps", "type": "uint256" }
    ],
    "name": "createLendingPool",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Simple FeeCollector ABI
const FEE_COLLECTOR_ABI = [
  {
    "inputs": [],
    "name": "getPoolCreationFee",
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
    "name": "poolCreationFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  const yourAddress = process.env.NEXT_PUBLIC_EXPECTED_OWNER;

  if (!factoryAddress || !yourAddress) {
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

  console.log('🔍 FACTORY AND FEE COLLECTOR DIAGNOSTIC TOOL');
  console.log('============================================');
  console.log(`Checking factory: ${factoryAddress}`);
  console.log(`Your address: ${yourAddress}`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });
  
  try {
    // Check factory bytecode
    const factoryCode = await publicClient.getBytecode({ address: factoryAddress });
    if (!factoryCode || factoryCode === '0x') {
      console.error('❌ ERROR: Factory contract does not exist at the provided address!');
      return;
    }
    
    console.log('\n1️⃣ FACTORY CONTRACT CHECK');
    console.log('------------------------');
    
    // Get factory owner
    const factoryOwner = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'owner'
    });
    
    console.log(`Factory owner: ${factoryOwner}`);
    
    if (factoryOwner.toLowerCase() === yourAddress.toLowerCase()) {
      console.log('✅ You are the owner of the factory contract');
    } else {
      console.log('❌ You are NOT the owner of the factory contract');
      console.log(`   Current owner: ${factoryOwner}`);
      console.log(`   Your address: ${yourAddress}`);
      console.log('   This explains the "Ownable: caller is not the owner" error');
    }
    
    // Get implementation address
    const implementationAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'implementation'
    });
    
    console.log(`Implementation address: ${implementationAddress}`);
    
    // Check implementation bytecode
    const implCode = await publicClient.getBytecode({ address: implementationAddress });
    if (!implCode || implCode === '0x') {
      console.log('❌ Implementation contract does not exist or has no code!');
    } else {
      console.log('✅ Implementation contract has valid bytecode');
    }
    
    // Get fee collector address
    const feeCollectorAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'feeCollector'
    });
    
    console.log(`Fee collector address: ${feeCollectorAddress}`);
    
    console.log('\n2️⃣ FEE COLLECTOR CHECK');
    console.log('----------------------');
    
    // Get fee collector bytecode
    const feeCollectorCode = await publicClient.getBytecode({ address: feeCollectorAddress });
    if (!feeCollectorCode || feeCollectorCode === '0x') {
      console.log('❌ Fee collector contract does not exist or has no code!');
      return;
    }
    
    console.log('✅ Fee collector contract has valid bytecode');
    
    // Try to read pool creation fee
    let poolCreationFee;
    try {
      // First try the getPoolCreationFee function (recommended)
      poolCreationFee = await publicClient.readContract({
        address: feeCollectorAddress,
        abi: FEE_COLLECTOR_ABI,
        functionName: 'getPoolCreationFee'
      });
      console.log('✅ Successfully read fee using getPoolCreationFee()');
    } catch (error) {
      console.log('⚠️ getPoolCreationFee() function failed, trying poolCreationFee variable...');
      try {
        // Fallback to direct poolCreationFee variable
        poolCreationFee = await publicClient.readContract({
          address: feeCollectorAddress,
          abi: FEE_COLLECTOR_ABI,
          functionName: 'poolCreationFee'
        });
        console.log('✅ Successfully read fee using poolCreationFee variable');
      } catch (error) {
        console.error('❌ Could not read pool creation fee by any method!');
        console.error('   This suggests an incompatible FeeCollector contract');
        poolCreationFee = BigInt(0);
      }
    }
    
    const feeInETH = Number(poolCreationFee) / 1e18;
    console.log(`Pool creation fee: ${poolCreationFee} wei (${feeInETH} ETH)`);
    
    // Check if fee is 0.05 ETH
    const expectedFee = parseEther('0.05');
    if (poolCreationFee !== expectedFee) {
      console.log(`⚠️ Fee does not match expected value of 0.05 ETH (${expectedFee} wei)`);
    } else {
      console.log('✅ Fee matches expected value of 0.05 ETH');
    }
    
    // Try to get fee collector owner
    try {
      const feeCollectorOwner = await publicClient.readContract({
        address: feeCollectorAddress,
        abi: FEE_COLLECTOR_ABI,
        functionName: 'owner'
      });
      
      console.log(`Fee collector owner: ${feeCollectorOwner}`);
      
      if (feeCollectorOwner.toLowerCase() === factoryOwner.toLowerCase()) {
        console.log('✅ Factory and fee collector have the same owner');
      } else {
        console.log('⚠️ Factory and fee collector have different owners!');
      }
    } catch (error) {
      console.error('❌ Could not read fee collector owner!');
    }
    
    console.log('\n3️⃣ OVERALL DIAGNOSIS');
    console.log('-------------------');
    
    if (factoryOwner.toLowerCase() !== yourAddress.toLowerCase()) {
      console.log('🔴 CRITICAL: You are not the owner of the factory contract.');
      console.log('   This is the primary reason for the "Ownable: caller is not the owner" error.');
      console.log('   You must use the correct owner address to call createLendingPool.');
      console.log(`   Current owner: ${factoryOwner}`);
      console.log(`   Your address: ${yourAddress}`);
    } else if (poolCreationFee === BigInt(0)) {
      console.log('🟠 WARNING: Pool creation fee is set to 0.');
      console.log('   This might be intentional, but unusual. Check the fee collector configuration.');
    } else if (poolCreationFee !== expectedFee) {
      console.log(`🟠 WARNING: Pool creation fee (${feeInETH} ETH) does not match expected 0.05 ETH.`);
      console.log('   Make sure you are sending the correct fee amount with your transaction.');
    } else {
      console.log('✅ All checks passed! The issue might be in the transaction details or asset validation.');
      console.log('   Double-check your asset address is a valid ERC20 token and no pool exists for it already.');
    }
    
  } catch (error) {
    console.error('Error during checks:', error);
  }
}

main(); 