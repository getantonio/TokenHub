const { createPublicClient, http, parseEther } = require('viem');
const { polygonAmoy } = require('viem/chains');

async function main() {
  // Use the correct factory address for Polygon Amoy
  const factoryAddress = '0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36';
  
  console.log(`Checking factory on Polygon Amoy: ${factoryAddress}`);
  
  const publicClient = createPublicClient({
    // Change chain to polygonAmoy
    chain: polygonAmoy,
    // Use the Infura Amoy RPC from .env.local
    transport: http('https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67') 
  });
  
  try {
    // Check if the contract exists at the address
    console.log("\nChecking if contract exists on Amoy...");
    const factoryCode = await publicClient.getBytecode({ address: factoryAddress });
    if (!factoryCode || factoryCode === '0x') {
      console.error('❌ ERROR: No contract exists at the provided address on Polygon Amoy!');
      return;
    }
    console.log('✅ Contract exists at the provided address on Amoy');
    console.log(`Code size: ${(factoryCode.length - 2) / 2} bytes`);
    
    // Try different implementation function signatures
    console.log("\nTrying to call implementation() on Amoy...");
    
    // Method 1: Standard implementation() function
    try {
      const implementationAbi = [{ 
        inputs: [], 
        name: 'implementation', 
        outputs: [{ internalType: 'address', name: '', type: 'address' }], 
        stateMutability: 'view', 
        type: 'function' 
      }];
      
      const implementation = await publicClient.readContract({
        address: factoryAddress,
        abi: implementationAbi,
        functionName: 'implementation'
      });
      
      console.log('✅ Successfully called implementation() function on Amoy');
      console.log(`Implementation address: ${implementation}`);
      
      // Check if implementation contract exists
      const implCode = await publicClient.getBytecode({ address: implementation });
      if (!implCode || implCode === '0x') {
        console.error('❌ Implementation contract does not exist or has no code on Amoy!');
      } else {
        console.log('✅ Implementation contract has valid bytecode on Amoy');
        console.log(`Implementation code size: ${(implCode.length - 2) / 2} bytes`);
      }
    } catch (error) {
      console.error('❌ Failed to call implementation() function on Amoy');
      console.error(`Error: ${error.message}`);
      // Log raw error if available for more details
      if (error.cause) console.error("Raw error:", error.cause);
    }
    
    // Method 2: ERC-1967 implementation slot directly
    console.log("\nTrying to read ERC-1967 implementation slot directly on Amoy...");
    try {
      // ERC1967 implementation slot
      const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
      
      const implSlotData = await publicClient.getStorageAt({
        address: factoryAddress,
        slot: IMPLEMENTATION_SLOT
      });
      
      // Parse the address from the slot data (last 20 bytes)
      const implAddress = `0x${implSlotData.slice(-40)}`;
      console.log(`Implementation address from slot: ${implAddress}`);
      
      // Check if implementation contract exists
      const implCode = await publicClient.getBytecode({ address: implAddress });
      if (!implCode || implCode === '0x') {
        console.error('❌ Implementation contract from slot does not exist or has no code on Amoy!');
      } else {
        console.log('✅ Implementation contract from slot has valid bytecode on Amoy');
        console.log(`Implementation code size: ${(implCode.length - 2) / 2} bytes`);
      }
    } catch (error) {
      console.error('❌ Failed to read implementation slot on Amoy');
      console.error(`Error: ${error.message}`);
    }
    
    // Try to call other common functions to see if the contract responds to any
    console.log("\nChecking basic contract functionality on Amoy...");
    
    // Try owner()
    try {
      const ownerAbi = [{ 
        inputs: [], 
        name: 'owner', 
        outputs: [{ internalType: 'address', name: '', type: 'address' }], 
        stateMutability: 'view', 
        type: 'function' 
      }];
      
      const owner = await publicClient.readContract({
        address: factoryAddress,
        abi: ownerAbi,
        functionName: 'owner'
      });
      
      console.log('✅ Successfully called owner() function on Amoy');
      console.log(`Owner address: ${owner}`);
    } catch (error) {
      console.error('❌ Failed to call owner() function on Amoy');
      console.error(`Error: ${error.message}`);
    }
    
    // Try immutable implementation variable
    // Note: Solidity doesn't directly expose immutable variables via ABI like this.
    // We rely on the `implementation()` function or storage slot check primarily.
    console.log("Skipping direct immutable variable check (not standard ABI accessible).");

  } catch (error) {
    console.error('Error during checks:', error);
  }
}

main(); 