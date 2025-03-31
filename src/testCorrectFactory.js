const { createPublicClient, getContract, createWalletClient, http, parseAbiItem, parseEther } = require('viem');
const { sepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const fs = require('fs');
const path = require('path');

// IMPORTANT: Load deployment data to get the correct factory address
const deploymentPath = path.join(__dirname, '../deployments/defi-sepolia.json');
const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// The CORRECT factory address from deployment
const correctFactoryAddress = deploymentData.factory;
console.log('Using the CORRECT factory address from deployment:', correctFactoryAddress);

// Create ABI for the factory (simplified for this test)
const factoryAbi = [
  parseAbiItem('function owner() view returns (address)'),
  parseAbiItem('function createLendingPool(address asset, string name, string symbol, uint256 collateralFactorBps, uint256 reserveFactorBps) payable returns (address)'),
  parseAbiItem('function assetToPools(address) view returns (address)'),
  parseAbiItem('function implementation() view returns (address)')
];

// Create public client for reading
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/demo')
});

// Main function to test - you should call this with the right private key 
// if you want to try a transaction
async function testFactoryInteraction() {
  try {
    console.log('Testing interaction with correct factory address...');

    // First check if we're the owner of the correct contract
    const owner = await publicClient.readContract({
      address: correctFactoryAddress,
      abi: factoryAbi,
      functionName: 'owner'
    });
    
    console.log(`Current owner of correct contract: ${owner}`);
    
    // Get implementation
    try {
      const implementation = await publicClient.readContract({
        address: correctFactoryAddress,
        abi: factoryAbi,
        functionName: 'implementation'
      });
      console.log(`Implementation address: ${implementation}`);
    } catch (err) {
      console.log('Could not check implementation:', err.message);
    }
    
    // To test a transaction, you would need to add your private key and uncomment this code
    /*
    // Create wallet client (DO NOT HARDCODE PRIVATE KEYS IN PRODUCTION!)
    const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY_HERE');
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http('https://eth-sepolia.g.alchemy.com/v2/demo')
    });
    
    // Test token params
    const testAsset = '0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056';  // Example token
    const testName = 'Test Lending Pool';
    const testSymbol = 'TLP';
    const collateralFactorBps = 7500;  // 75%
    const reserveFactorBps = 1000;    // 10%
    
    // Create pool transaction
    const hash = await walletClient.writeContract({
      address: correctFactoryAddress,
      abi: factoryAbi,
      functionName: 'createLendingPool',
      args: [testAsset, testName, testSymbol, collateralFactorBps, reserveFactorBps],
      value: parseEther('0.05')
    });
    
    console.log('Transaction submitted:', hash);
    */
    
  } catch (error) {
    console.error('Error interacting with factory:', error);
  }
}

// Run the test
testFactoryInteraction(); 