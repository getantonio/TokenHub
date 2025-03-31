const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

async function main() {
  // Transaction hash from your logs
  const txHash = process.argv[2];
  
  if (!txHash) {
    console.error('Please provide a transaction hash as an argument');
    process.exit(1);
  }
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });
  
  console.log('Fetching transaction details...');
  
  try {
    // Get transaction details
    const tx = await publicClient.getTransaction({ hash: txHash });
    console.log('\nTransaction Details:');
    console.log('------------------');
    console.log('Hash:', tx.hash);
    console.log('From:', tx.from);
    console.log('To:', tx.to);
    console.log('Value:', tx.value.toString());
    console.log('Function:', tx.input.slice(0, 10)); // First 10 bytes (4 bytes function signature + 0x)
    
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    console.log('\nTransaction Receipt:');
    console.log('------------------');
    console.log('Status:', receipt.status);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Effective Gas Price:', receipt.effectiveGasPrice.toString());
    
    // Check if the transaction failed
    if (receipt.status === 'reverted') {
      console.log('\n⚠️ Transaction Failed ⚠️');
      console.log('------------------');
      
      // Try to get the revert reason using eth_call with the same params
      try {
        // Recreate the transaction for simulation
        const callResult = await publicClient.call({
          to: tx.to,
          data: tx.input,
          value: tx.value,
          from: tx.from,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          blockNumber: receipt.blockNumber
        });
        
        console.log('Call simulation successful (this is unexpected for a reverted transaction)');
        console.log('Result:', callResult);
      } catch (callError) {
        console.log('Call simulation failed with error:');
        
        // Extract revert reason
        let reason = 'Unknown reason';
        if (callError.message) {
          const reasonMatch = callError.message.match(/reverted with reason string '(.+?)'/);
          if (reasonMatch) {
            reason = reasonMatch[1];
          } else if (callError.message.includes('reverted with custom error')) {
            reason = 'Custom contract error';
          }
        }
        
        console.log('Revert reason:', reason);
        console.log('Error:', callError.message);
      }
    }
    
    // Check for any events emitted
    if (receipt.logs && receipt.logs.length > 0) {
      console.log('\nEvents Emitted:');
      console.log('------------------');
      for (const log of receipt.logs) {
        console.log('Address:', log.address);
        console.log('Topics:', log.topics);
        console.log('Data:', log.data);
        console.log('------------------');
      }
    } else {
      console.log('\nNo events were emitted by this transaction');
    }
    
  } catch (error) {
    console.error('Error fetching transaction details:', error);
  }
}

main(); 