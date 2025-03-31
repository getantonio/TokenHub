// Utility function to debug pool creation issues on TokenFactory
// Run this with a transaction hash to examine transaction details

const { createPublicClient, http, decodeAbiParameters, parseAbi } = require('viem');
const { sepolia } = require('viem/chains');

const txHash = process.argv[2];

if (!txHash) {
  console.error('Please provide a transaction hash');
  process.exit(1);
}

// Helper function to handle BigInt serialization
const bigIntReplacer = (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

async function debugTransaction(hash) {
  console.log(`Debugging transaction ${hash}...`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://eth-sepolia.public.blastapi.io'),
  });

  try {
    // Get transaction
    console.log('Fetching transaction...');
    const tx = await publicClient.getTransaction({ hash });
    console.log('Transaction details:', JSON.stringify(tx, bigIntReplacer, 2));

    // Get receipt
    console.log('\nFetching receipt...');
    const receipt = await publicClient.getTransactionReceipt({ hash });
    console.log('Receipt status:', receipt.status);
    console.log('Receipt logs count:', receipt.logs.length);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Gas limit:', tx.gas.toString());
    console.log('Fee paid:', ((BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)) / BigInt(10**18)).toString(), 'ETH');
    
    // Look for PoolCreated event (topic hash: 0x21a9d8e221211780696258a0986638686c9b9bc553568bff5192bb340a4a4f19)
    const poolCreatedEvent = receipt.logs.find(log => 
      log.topics[0] === '0x21a9d8e221211780696258a0986638686c9b9bc553568bff5192bb340a4a4f19'
    );
    
    if (poolCreatedEvent) {
      console.log('\nPool created event found!');
      console.log('Event data:', JSON.stringify(poolCreatedEvent, bigIntReplacer, 2));
      if (poolCreatedEvent.topics.length >= 3) {
        const poolAddress = `0x${poolCreatedEvent.topics[2].substring(26)}`;
        console.log('New pool address:', poolAddress);
      }
    } else {
      console.log('\nNo pool created event found.');
      if (receipt.logs.length > 0) {
        console.log('Available topics:');
        receipt.logs.forEach((log, i) => {
          console.log(`Log ${i}:`, log.topics[0]);
        });
      }
    }
    
    // Get contract at the target address to verify it's the expected contract
    const to = tx.to;
    console.log('\nTarget contract:', to);
    
    try {
      // Decode the function call
      if (tx.input) {
        // The function signature is the first 4 bytes of the input data
        const functionSignature = tx.input.slice(0, 10);
        console.log('Function signature:', functionSignature);
        
        if (functionSignature === '0x8807694e') { // createLendingPool function
          console.log('Function: createLendingPool');
          
          try {
            // Define parameter types for this function
            const types = [
              { name: '_asset', type: 'address' },
              { name: '_name', type: 'string' },
              { name: '_symbol', type: 'string' },
              { name: '_collateralFactorBps', type: 'uint256' },
              { name: '_reserveFactorBps', type: 'uint256' }
            ];
            
            // The parameters start after the function signature (position 10)
            const params = `0x${tx.input.slice(10)}`;
            
            // Try to decode the parameters (simplified approach)
            console.log('Parameter data (hex):', params.slice(0, 128) + '...');
            
            // Extract asset address (first parameter)
            const assetAddress = `0x${tx.input.slice(34, 74)}`;
            console.log('Asset address parameter:', assetAddress);
            
            // Try to get value sent
            console.log('Value sent with transaction:', (BigInt(tx.value) / BigInt(10**18)).toString(), 'ETH');
            
          } catch (err) {
            console.error('Error decoding parameters:', err.message);
          }
        }
      }
      
      // Extract the asset address from the transaction input
      const assetAddress = `0x${tx.input.slice(34, 74)}`;
      console.log('Asset address from transaction:', assetAddress);
      
      // Check if a pool exists for this asset
      try {
        const result = await publicClient.readContract({
          address: to,
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
        
        console.log('Pool lookup result:', result);
        if (result && result !== '0x0000000000000000000000000000000000000000') {
          console.log('Pool exists for asset at address:', result);
        } else {
          console.log('No pool exists for this asset');
        }
      } catch (err) {
        console.error('Error looking up pool:', err.message);
      }

      // Check required fee
      try {
        // Some contracts might have a poolCreationFee function
        const createPoolFee = await publicClient.readContract({
          address: to,
          abi: [
            {
              "inputs": [],
              "name": "poolCreationFee",
              "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'poolCreationFee'
        }).catch(() => null);
        
        if (createPoolFee) {
          console.log('Required pool creation fee:', (BigInt(createPoolFee) / BigInt(10**18)).toString(), 'ETH');
          console.log('Was correct fee sent?', BigInt(tx.value) >= BigInt(createPoolFee) ? 'Yes' : 'No');
        }
      } catch (err) {
        // Ignore fee checking errors
      }
    } catch (err) {
      console.error('Error analyzing contract:', err.message);
    }
    
    // Check for errors or reverts
    if (receipt.status === 'reverted') {
      console.log('\nTransaction reverted!');
      
      // Try to simulate the transaction to get revert reason
      try {
        console.log('Attempting to simulate the transaction to find revert reason...');
        console.log('Note: This might not be accurate as the blockchain state has changed since this tx');
        
        // Get owner information
        try {
          const owner = await publicClient.readContract({
            address: tx.to,
            abi: [
              {
                "inputs": [],
                "name": "owner",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'owner'
          }).catch(() => null);
          
          if (owner) {
            console.log('Contract owner:', owner);
            console.log('Transaction sender:', tx.from);
            console.log('Is sender the owner?', owner.toLowerCase() === tx.from.toLowerCase() ? 'Yes' : 'No');
            
            if (owner.toLowerCase() !== tx.from.toLowerCase()) {
              console.log('Likely revert reason: NotOwner - only the contract owner can create pools');
            }
          }
        } catch (err) {
          // Ignore owner check errors
        }
        
        console.log('\nPossible revert reasons based on the factory contract:');
        console.log('1. NotOwner() - Only the contract owner can create pools');
        console.log('2. PoolAlreadyExists(address) - A pool for this asset already exists');
        console.log('3. InvalidAsset() - The asset address is not a valid ERC20 token');
        console.log('4. InvalidCollateralFactor() - The collateral factor value is invalid');
        console.log('5. InvalidReserveFactor() - The reserve factor value is invalid');
        console.log('6. PoolCreationFailed() - An internal error occurred during pool creation');
        console.log('7. Insufficient fee - The transaction might not include the required fee');
      } catch (err) {
        console.error('Error simulating transaction:', err.message);
      }
    }
  } catch (err) {
    console.error('Error debugging transaction:', err);
  }
}

debugTransaction(txHash);
