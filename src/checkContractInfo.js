const { createPublicClient, http, parseAbiItem } = require('viem');
const { sepolia } = require('viem/chains');
const fs = require('fs');
const path = require('path');

// Load deployment data
const deploymentPath = path.join(__dirname, '../deployments/defi-sepolia.json');
const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Factory and account addresses from your transaction
const factoryAddressInTx = '0xB062C0d5a8Da595398c36f16BC7daA5054Ff9340';  // From Etherscan tx
const factoryAddressInDeployment = deploymentData.factory;
const userAddress = '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F';    // From your debug logs

console.log('Deployment data factory address:', factoryAddressInDeployment);
console.log('Factory address in transaction:', factoryAddressInTx);
console.log('Are they the same?', factoryAddressInDeployment.toLowerCase() === factoryAddressInTx.toLowerCase());

// If addresses don't match, that's the issue - wrong factory address!
if (factoryAddressInDeployment.toLowerCase() !== factoryAddressInTx.toLowerCase()) {
  console.log('\nMISMATCH DETECTED: You are trying to interact with a different contract than what was deployed!');
  console.log('This is likely the cause of the ownership issue.');
}

// Create the client to check more details if needed
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/demo')
});

async function checkContractDetails() {
  try {
    // Check if contract exists at both addresses
    const deployedCode = await publicClient.getBytecode({ address: factoryAddressInDeployment });
    const txCode = await publicClient.getBytecode({ address: factoryAddressInTx });
    
    console.log('\nContract bytecode check:');
    console.log('- Deployment address has code:', deployedCode && deployedCode !== '0x' ? 'Yes' : 'No');
    console.log('- Transaction address has code:', txCode && txCode !== '0x' ? 'Yes' : 'No');
    
    // If we have access to implementation, let's check that too
    try {
      const implementationAbi = parseAbiItem('function implementation() view returns (address)');
      
      // Check implementation for both addresses if possible
      if (deployedCode && deployedCode !== '0x') {
        const deployedImpl = await publicClient.readContract({
          address: factoryAddressInDeployment,
          abi: [implementationAbi],
          functionName: 'implementation'
        });
        console.log('- Deployed contract implementation:', deployedImpl);
      }
      
      if (txCode && txCode !== '0x') {
        const txImpl = await publicClient.readContract({
          address: factoryAddressInTx,
          abi: [implementationAbi],
          functionName: 'implementation'
        });
        console.log('- Transaction contract implementation:', txImpl);
      }
    } catch (err) {
      console.log('Could not check implementations:', err.message);
    }
  } catch (error) {
    console.error('Error checking contract details:', error);
  }
}

// Run the check
checkContractDetails(); 