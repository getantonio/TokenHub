// Check if a pool exists for a specific asset
// Usage: node check-pool.js <factory-address> <asset-address>
// Example: node check-pool.js 0x1234... 0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056

const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

const factoryAddress = process.argv[2];
const assetAddress = process.argv[3];

if (!factoryAddress || !assetAddress) {
  console.error('Please provide a factory address and asset address');
  console.error('Usage: node check-pool.js <factory-address> <asset-address>');
  process.exit(1);
}

async function checkPool() {
  console.log(`Checking for pool of asset ${assetAddress} in factory ${factoryAddress}...`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://eth-sepolia.public.blastapi.io'),
  });

  try {
    // Check if factory contract exists and is valid
    const factoryCode = await publicClient.getBytecode({ address: factoryAddress });
    if (!factoryCode || factoryCode === '0x') {
      console.error('Factory contract not found at the provided address');
      return;
    }
    
    console.log('Factory contract exists at the provided address');
    
    // Check if the asset address is valid
    const assetCode = await publicClient.getBytecode({ address: assetAddress });
    console.log('Asset contract exists:', assetCode && assetCode !== '0x' ? 'Yes' : 'No');
    
    // Get the pool address for the asset
    const poolAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "assetToPools",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'assetToPools',
      args: [assetAddress]
    });
    
    console.log('Pool address:', poolAddress);
    
    if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
      console.log('Pool exists for this asset!');
      
      // Optional: Get pool details
      try {
        const poolCode = await publicClient.getBytecode({ address: poolAddress });
        console.log('Pool contract exists:', poolCode && poolCode !== '0x' ? 'Yes' : 'No');
      } catch (err) {
        console.error('Error checking pool contract:', err.message);
      }
    } else {
      console.log('No pool exists for this asset');
    }
    
    // List all pools
    try {
      const allPools = await publicClient.readContract({
        address: factoryAddress,
        abi: [
          {
            "inputs": [],
            "name": "getAllPools",
            "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getAllPools'
      });
      
      console.log('\nAll pools in factory:');
      if (allPools && allPools.length > 0) {
        allPools.forEach((pool, i) => {
          console.log(`Pool ${i+1}: ${pool}`);
        });
      } else {
        console.log('No pools found');
      }
    } catch (err) {
      console.error('Error getting all pools:', err.message);
    }
  } catch (err) {
    console.error('Error checking for pool:', err);
  }
}

checkPool(); 