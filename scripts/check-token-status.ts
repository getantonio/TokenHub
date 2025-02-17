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
      'function allowance(address owner, address spender) view returns (uint256)',
      'function balanceOf(address account) view returns (uint256)',
      'function owner() view returns (address)'
    ],
    wallet
  );

  console.log('\nChecking token status...');
  
  // Get token info
  const [totalSupply, balance, allowance, owner, isListed] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(wallet.address),
    token.allowance(wallet.address, FACTORY_ADDRESS),
    token.owner(),
    factory.isListed(TOKEN_ADDRESS)
  ]);

  console.log('Token Address:', TOKEN_ADDRESS);
  console.log('Total Supply:', ethers.formatEther(totalSupply), 'tokens');
  console.log('Your Balance:', ethers.formatEther(balance), 'tokens');
  console.log('Factory Allowance:', ethers.formatEther(allowance), 'tokens');
  console.log('Token Owner:', owner);
  console.log('Is Listed:', isListed);

  // Get token info from factory
  const tokenInfo = await factory.getTokenInfo(TOKEN_ADDRESS);
  console.log('\nFactory Token Info:');
  console.log('Is Listed:', tokenInfo.isListed);
  console.log('DEX Name:', tokenInfo.dexName);
  console.log('Creation Time:', new Date(Number(tokenInfo.creationTime) * 1000).toLocaleString());
  console.log('Listing Time:', Number(tokenInfo.listingTime) > 0 ? new Date(Number(tokenInfo.listingTime) * 1000).toLocaleString() : 'Not listed');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 