require('dotenv').config();
const { ethers } = require('ethers');
const TokenFactoryV2DirectDEXTwoStepABI = require('../src/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep.json');

async function main() {
  const TOKEN_ADDRESS = '0x6F73a8A91faA1520b5FC7580534c63D8b14A309E';
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
  
  if (!process.env.INFURA_PROJECT_ID) {
    throw new Error('INFURA_PROJECT_ID not set in .env file');
  }

  const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Debug Information:');
  console.log('=================');
  console.log('Account:', wallet.address);
  console.log('Token:', TOKEN_ADDRESS);
  console.log('Factory:', FACTORY_ADDRESS);
  
  // Check token contract code
  const code = await provider.getCode(TOKEN_ADDRESS);
  console.log('\nToken Contract:');
  console.log('Has code:', code !== '0x');
  console.log('Code length:', (code.length - 2) / 2, 'bytes');
  
  // Create contract instances
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    TokenFactoryV2DirectDEXTwoStepABI.abi,
    wallet
  );
  
  const token = new ethers.Contract(
    TOKEN_ADDRESS,
    [
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
      'function owner() view returns (address)',
      'function approve(address,uint256) returns (bool)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ],
    wallet
  );
  
  // Get token info
  const [
    name,
    symbol,
    totalSupply,
    balance,
    allowance,
    owner,
    isListed,
    listingFee
  ] = await Promise.all([
    token.name(),
    token.symbol(),
    token.totalSupply(),
    token.balanceOf(wallet.address),
    token.allowance(wallet.address, FACTORY_ADDRESS),
    token.owner(),
    factory.isListed(TOKEN_ADDRESS),
    factory.getListingFee()
  ]);
  
  console.log('\nToken Information:');
  console.log('Name:', name);
  console.log('Symbol:', symbol);
  console.log('Total Supply:', ethers.formatEther(totalSupply), 'tokens');
  console.log('Your Balance:', ethers.formatEther(balance), 'tokens');
  console.log('Factory Allowance:', ethers.formatEther(allowance), 'tokens');
  console.log('Owner:', owner);
  console.log('Is Listed:', isListed);
  console.log('Listing Fee:', ethers.formatEther(listingFee), 'ETH');
  
  // Check if we need to approve
  if (allowance < totalSupply) {
    console.log('\nNeed to approve tokens for factory');
    try {
      const approveTx = await token.approve(FACTORY_ADDRESS, totalSupply);
      console.log('Approval tx:', approveTx.hash);
      await approveTx.wait();
      console.log('Approval confirmed');
      
      // Check new allowance
      const newAllowance = await token.allowance(wallet.address, FACTORY_ADDRESS);
      console.log('New allowance:', ethers.formatEther(newAllowance), 'tokens');
    } catch (error: any) {
      console.error('Error approving tokens:', error.message);
      return;
    }
  }
  
  // Check DEX configuration
  const dexNames = await factory.getSupportedDEXes();
  console.log('\nSupported DEXes:', dexNames);
  
  for (const name of dexNames) {
    const dexInfo = await factory.getDEXRouter(name);
    console.log(`\nDEX: ${name}`);
    console.log('Router:', dexInfo.router);
    console.log('Is Active:', dexInfo.isActive);
  }
  
  // Get account ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('\nAccount ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
  
  // Calculate required ETH
  const requiredETH = listingFee + ethers.parseEther('0.1'); // listing fee + initial liquidity
  console.log('Required ETH:', ethers.formatEther(requiredETH), 'ETH');
  console.log('Have enough ETH:', ethBalance >= requiredETH);
}

main()
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error('Error:', error.message || error);
    process.exit(1);
  }); 