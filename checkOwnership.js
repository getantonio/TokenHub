const { createPublicClient, http, parseAbiItem } = require('viem');
const { sepolia } = require('viem/chains');

// Factory and account addresses
const factoryAddress = '0xB062C0d5a8Da595398c36f16BC7daA5054Ff9340';  // From Etherscan tx
const userAddress = '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F';    // From your debug logs

// Create the client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/demo')  // Using Alchemy demo endpoint
});

// Main function
async function checkOwnership() {
  console.log('Checking contract ownership...');

  try {
    // ABI for owner function
    const ownerAbi = parseAbiItem('function owner() view returns (address)');
    
    // Get current owner
    const owner = await publicClient.readContract({
      address: factoryAddress,
      abi: [ownerAbi],
      functionName: 'owner'
    });
    
    console.log(`Current owner of contract: ${owner}`);
    console.log(`Your address: ${userAddress}`);
    console.log(`Are you the owner? ${owner.toLowerCase() === userAddress.toLowerCase()}`);
    
    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      console.log('You are NOT the owner of this contract, which explains the NotOwner error');
    } else {
      console.log('You ARE the owner but still getting NotOwner error - this is unexpected');
      // If you're the owner but still getting NotOwner, we need to check further
    }
  } catch (error) {
    console.error('Error checking ownership:', error);
  }
}

// Run the check
checkOwnership(); 