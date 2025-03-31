require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');

// FeeCollector ABI - only the functions we need
const FEE_COLLECTOR_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "authorizedCallers",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_caller", "type": "address" }],
    "name": "authorizeCaller",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log("Authorizing factory to collect fees...");
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable not set");
  }
  
  // Get contract addresses from environment
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  const feeCollectorAddress = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS;
  
  if (!factoryAddress || !feeCollectorAddress) {
    throw new Error("Required environment variables not set");
  }
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`Fee Collector address: ${feeCollectorAddress}`);
  
  // Create wallet client
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  console.log(`Using account: ${account.address}`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });
  
  // Check if factory is already authorized
  const isAuthorized = await publicClient.readContract({
    address: feeCollectorAddress,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'authorizedCallers',
    args: [factoryAddress]
  });
  
  console.log(`Is factory already authorized? ${isAuthorized}`);
  
  if (!isAuthorized) {
    console.log("Authorizing factory...");
    
    const { request } = await publicClient.simulateContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI,
      functionName: 'authorizeCaller',
      args: [factoryAddress],
      account
    });
    
    const hash = await walletClient.writeContract(request);
    console.log(`Transaction hash: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify authorization
    const isNowAuthorized = await publicClient.readContract({
      address: feeCollectorAddress,
      abi: FEE_COLLECTOR_ABI,
      functionName: 'authorizedCallers',
      args: [factoryAddress]
    });
    
    console.log(`Is factory now authorized? ${isNowAuthorized}`);
  } else {
    console.log("Factory is already authorized to collect fees.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 