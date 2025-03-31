// Debug Factory Contract functionality
// This script tests the factory contract to identify issues with pool creation

const { createPublicClient, http, parseAbi } = require('viem');
const { sepolia } = require('viem/chains');

const factoryAddress = process.argv[2] || '0xB062C0d5a8Da595398c36f16BC7daA5054Ff9340';

// Helper function to handle BigInt serialization
const bigIntReplacer = (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

async function debugFactory() {
  console.log(`Debugging factory contract at ${factoryAddress}...`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://eth-sepolia.public.blastapi.io'),
  });

  try {
    // Check contract exists
    const bytecode = await publicClient.getBytecode({ address: factoryAddress });
    if (!bytecode || bytecode === '0x') {
      console.error('Factory contract not found (no bytecode)');
      return;
    }
    
    console.log('Factory contract exists (has bytecode)');
    
    // Basic ABI for factory interrogation
    const factoryAbi = parseAbi([
      'function implementation() view returns (address)',
      'function feeCollector() view returns (address)',
      'function priceOracle() view returns (address)',
      'function interestRateModel() view returns (address)',
      'function getAllPools() view returns (address[])',
      'function getPoolCount() view returns (uint256)',
      'function owner() view returns (address)',
      'function assetToPools(address) view returns (address)',
      'error NotOwner()',
      'error InvalidImplementation()',
      'error InvalidPriceOracle()',
      'error InvalidInterestRateModel()',
      'error InvalidAsset()',
      'error PoolAlreadyExists(address)',
      'error PoolCreationFailed()',
      'error InvalidCollateralFactor()',
      'error InvalidReserveFactor()'
    ]);
    
    // Check contract key properties
    console.log('\nChecking factory contract configuration...');
    
    try {
      const impl = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'implementation'
      });
      console.log('Implementation address:', impl);
      
      const implBytecode = await publicClient.getBytecode({ address: impl });
      console.log('Implementation has bytecode:', implBytecode && implBytecode !== '0x' ? 'Yes' : 'No');
    } catch (err) {
      console.error('Error reading implementation:', err.message);
    }
    
    try {
      const oracle = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'priceOracle'
      });
      console.log('Price oracle address:', oracle);
      
      const oracleBytecode = await publicClient.getBytecode({ address: oracle });
      console.log('Oracle has bytecode:', oracleBytecode && oracleBytecode !== '0x' ? 'Yes' : 'No');
    } catch (err) {
      console.error('Error reading price oracle:', err.message);
    }
    
    try {
      const model = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'interestRateModel'
      });
      console.log('Interest rate model address:', model);
      
      const modelBytecode = await publicClient.getBytecode({ address: model });
      console.log('Model has bytecode:', modelBytecode && modelBytecode !== '0x' ? 'Yes' : 'No');
    } catch (err) {
      console.error('Error reading interest rate model:', err.message);
    }
    
    try {
      const collector = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'feeCollector'
      });
      console.log('Fee collector address:', collector);
    } catch (err) {
      console.error('Error reading fee collector:', err.message);
    }
    
    try {
      const owner = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'owner'
      });
      console.log('Owner address:', owner);
    } catch (err) {
      console.error('Error reading owner address:', err.message);
    }
    
    try {
      const count = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'getPoolCount'
      });
      console.log('Pool count:', count.toString());
    } catch (err) {
      console.error('Error reading pool count:', err.message);
    }
    
    // Check for potential revert reasons based on common errors
    console.log('\nChecking potential revert reasons for pool creation...');
    
    // Mock asset address 
    const assetAddress = '0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056';
    
    // ERC20 token checks
    try {
      const erc20Abi = parseAbi([
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ]);
      
      const symbol = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'symbol'
      });
      
      const decimals = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'decimals'
      });
      
      const totalSupply = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'totalSupply'
      });
      
      console.log('Asset token details:');
      console.log('  Symbol:', symbol);
      console.log('  Decimals:', decimals);
      console.log('  Total Supply:', totalSupply.toString());
    } catch (err) {
      console.error('Error reading token details:', err.message);
      console.log('This could indicate the asset is not a valid ERC20 token');
    }
    
    // Check transaction error details
    console.log('\nAnalyzing failed transaction...');
    
    // Try to simulate a pool creation transaction to see possible errors
    console.log('This will require a wallet - manual checking with Etherscan is recommended.');
    console.log('Recommended Etherscan checks:');
    console.log('1. Check if your wallet has enough ETH for fees');
    console.log('2. Check if the user has permission to create pools (e.g., if owner-only)');
    console.log('3. Check transaction parameters for invalid values');
    
  } catch (err) {
    console.error('Error debugging factory:', err);
  }
}

debugFactory(); 