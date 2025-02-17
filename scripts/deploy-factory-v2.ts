require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log('\n=== Starting Deployment Process ===\n');
  
  // Get deployer account
  console.log('Getting deployer account...');
  const [deployer] = await ethers.getSigners();
  console.log('Deployer account:', deployer.address);
  
  // Get deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log('Deployer balance:', ethers.formatEther(balance), 'ETH');

  // Get network conditions
  console.log('\nChecking network conditions...');
  const feeData = await deployer.provider.getFeeData();
  console.log('Current gas price:', ethers.formatUnits(feeData.gasPrice || 0, 'gwei'), 'gwei');
  console.log('Max fee per gas:', ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei'), 'gwei');
  console.log('Max priority fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, 'gwei'), 'gwei');

  // Get listing fee
  console.log('\nCalculating listing fee...');
  const listingFee = process.env.FACTORY_FEE ? 
    ethers.parseEther(process.env.FACTORY_FEE) : 
    ethers.parseEther('0.0001');
  console.log('Using listing fee:', ethers.formatEther(listingFee), 'ETH');

  // Deploy TokenFactory_v2_Bake_v2
  console.log('\nDeploying TokenFactory_v2_Bake_v2...');
  console.log('1. Getting contract factory...');
  const TokenFactory = await ethers.getContractFactory('TokenFactory_v2_Bake_v2');
  
  console.log('2. Deploying contract...');
  console.log('   This may take a few minutes. Please wait...');
  
  // Set deployment options with higher gas settings
  const deploymentOptions = {
    gasLimit: 5000000, // Increased gas limit
    maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(12) / BigInt(10) : undefined, // 20% higher
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * BigInt(12) / BigInt(10) : undefined // 20% higher
  };

  try {
    const factory = await TokenFactory.deploy(listingFee, deploymentOptions);
    
    console.log('3. Waiting for deployment transaction...');
    console.log('   Transaction hash:', factory.deploymentTransaction()?.hash);
    
    // Set timeout for deployment (5 minutes)
    const deploymentTimeout = 300000; // 5 minutes in milliseconds
    const deploymentStart = Date.now();
    
    // Wait for deployment with timeout
    while (Date.now() - deploymentStart < deploymentTimeout) {
      try {
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        
        console.log('\n✅ TokenFactory_v2_Bake_v2 deployed successfully!');
        console.log('Contract address:', factoryAddress);
        console.log('Listing fee set to:', ethers.formatEther(listingFee), 'ETH');

        // Configure DEXes
        console.log('\n=== Configuring DEXes ===\n');

        // Router addresses
        const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        const PANCAKESWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

        // Add Uniswap with higher gas settings
        console.log('Adding Uniswap...');
        console.log('1. Sending addDEX transaction...');
        const uniswapTx = await factory.addDEX("uniswap-test", UNISWAP_ROUTER, {
          gasLimit: 200000,
          maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(12) / BigInt(10) : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * BigInt(12) / BigInt(10) : undefined
        });
        console.log('   Transaction hash:', uniswapTx.hash);
        console.log('2. Waiting for confirmation...');
        await uniswapTx.wait();
        console.log('✅ Uniswap added successfully');

        // Add PancakeSwap with higher gas settings
        console.log('\nAdding PancakeSwap...');
        console.log('1. Sending addDEX transaction...');
        const pancakeswapTx = await factory.addDEX("pancakeswap-test", PANCAKESWAP_ROUTER, {
          gasLimit: 200000,
          maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(12) / BigInt(10) : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * BigInt(12) / BigInt(10) : undefined
        });
        console.log('   Transaction hash:', pancakeswapTx.hash);
        console.log('2. Waiting for confirmation...');
        await pancakeswapTx.wait();
        console.log('✅ PancakeSwap added successfully');

        // Verify configurations
        console.log('\nVerifying DEX configurations...');
        const uniswapInfo = await factory.getDEXRouter("uniswap-test");
        const pancakeswapInfo = await factory.getDEXRouter("pancakeswap-test");

        console.log('\nFinal DEX Configurations:');
        console.log('Uniswap:', {
          name: "uniswap-test",
          router: uniswapInfo.router,
          isActive: uniswapInfo.isActive
        });
        console.log('PancakeSwap:', {
          name: "pancakeswap-test",
          router: pancakeswapInfo.router,
          isActive: pancakeswapInfo.isActive
        });

        console.log('\n=== Deployment Summary ===');
        console.log('✅ Contract deployed to:', factoryAddress);
        console.log('✅ Listing fee set to:', ethers.formatEther(listingFee), 'ETH');
        console.log('✅ Uniswap configured');
        console.log('✅ PancakeSwap configured');
        
        console.log('\n⚠️  Important: Update your .env file with:');
        console.log('NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS=' + factoryAddress);
        
        return; // Exit the while loop if successful
      } catch (error) {
        // If we hit an error but haven't timed out, continue waiting
        console.log('Still waiting for deployment... Time elapsed:', Math.round((Date.now() - deploymentStart)/1000), 'seconds');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before checking again
      }
    }
    
    // If we get here, we've timed out
    throw new Error('Deployment timed out after 5 minutes');

  } catch (error) {
    console.error('\n❌ Error during deployment:', error);
    if (error.reason) console.error('Reason:', error.reason);
    if (error.error?.message) console.error('Error message:', error.error.message);
    if (error.transaction) {
      console.error('Transaction details:', {
        hash: error.transaction.hash,
        from: error.transaction.from,
        to: error.transaction.to,
        data: error.transaction.data?.slice(0, 66) + '...' // Show only beginning of data
      });
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n=== Deployment Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }); 