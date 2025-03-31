const fetch = require('node-fetch');

async function main() {
  // The transaction hash from the logs
  // Replace this with the actual transaction hash from your logs
  const transactionHash = process.argv[2];
  if (!transactionHash) {
    console.error('Please provide a transaction hash as a command line argument');
    process.exit(1);
  }

  const apiKey = 'Z8FQT28BE7RR34GR5D8RMX6YGQ6AS6JSR2'; // From your .env.local
  const etherscanAPI = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`;
  const receiptAPI = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${transactionHash}&apikey=${apiKey}`;

  try {
    console.log(`Fetching transaction details for ${transactionHash}`);
    
    // Get transaction details
    const txResponse = await fetch(etherscanAPI);
    const txData = await txResponse.json();
    
    if (txData.error) {
      console.error('Error fetching transaction:', txData.error);
      return;
    }
    
    console.log('\nTransaction Details:');
    console.log('-------------------');
    console.log('From:', txData.result.from);
    console.log('To:', txData.result.to);
    console.log('Value:', parseInt(txData.result.value, 16) / 1e18, 'ETH');
    console.log('Gas:', parseInt(txData.result.gas, 16));
    console.log('Gas Price:', parseInt(txData.result.gasPrice, 16) / 1e9, 'Gwei');
    console.log('Input Data:', txData.result.input);
    
    // First 10 bytes of input data is the function signature
    const functionSignature = txData.result.input.slice(0, 10);
    console.log('Function Signature:', functionSignature);
    
    // Get transaction receipt
    const receiptResponse = await fetch(receiptAPI);
    const receiptData = await receiptResponse.json();
    
    if (receiptData.error) {
      console.error('Error fetching receipt:', receiptData.error);
      return;
    }
    
    console.log('\nTransaction Receipt:');
    console.log('-------------------');
    console.log('Status:', receiptData.result.status === '0x1' ? 'Success' : 'Failed');
    console.log('Block Number:', parseInt(receiptData.result.blockNumber, 16));
    console.log('Gas Used:', parseInt(receiptData.result.gasUsed, 16));
    
    // Get logs
    console.log('\nTransaction Logs:');
    console.log('----------------');
    
    if (receiptData.result.logs && receiptData.result.logs.length > 0) {
      receiptData.result.logs.forEach((log, index) => {
        console.log(`Log ${index + 1}:`);
        console.log(`  Address: ${log.address}`);
        console.log(`  Topics: ${JSON.stringify(log.topics)}`);
        console.log(`  Data: ${log.data}`);
        console.log('');
      });
    } else {
      console.log('No logs found (usually means the transaction failed)');
    }
    
    // Check if transaction was successful
    if (receiptData.result.status !== '0x1') {
      console.log('\nTransaction Failed!');
      console.log('-------------------');
      console.log('Possible reasons:');
      console.log('1. "Ownable: caller is not the owner" - The transaction sender is not the contract owner');
      console.log('2. "Pool already exists" - A pool for this asset already exists');
      console.log('3. "Insufficient fee" - The transaction value is less than the required fee');
      console.log('4. "Invalid parameters" - The pool parameters are invalid');
      console.log('5. Other contract-specific error');
    }
    
    // Check factory contract details
    const factoryAddress = txData.result.to;
    console.log('\nFactory Contract Details:');
    console.log('-----------------------');
    console.log('Factory Address:', factoryAddress);
    
    // Get factory contract ABI to decode function calls
    const contractAPI = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${factoryAddress}&apikey=${apiKey}`;
    const contractResponse = await fetch(contractAPI);
    const contractData = await contractResponse.json();
    
    if (contractData.status === '1') {
      console.log('Contract ABI available on Etherscan');
      // We could parse the ABI and decode the function call, but that's more complex
    } else {
      console.log('Contract ABI not verified on Etherscan');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 