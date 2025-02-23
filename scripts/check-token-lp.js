const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');

async function checkToken() {
  const tokenAddress = '0x94f72b30725dfbfda94790396215ad49be9aa7d9';
  const tokenABI = [
    'function uniswapV2Pair() view returns (address)',
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
  ];
  
  try {
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    const [pair, symbol, name] = await Promise.all([
      token.uniswapV2Pair(),
      token.symbol(),
      token.name()
    ]);
    console.log('Token Info:');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Pair Address:', pair);
    
    if (pair !== ethers.ZeroAddress) {
      const pairABI = [
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function getReserves() view returns (uint112,uint112,uint32)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)'
      ];
      const pairContract = new ethers.Contract(pair, pairABI, provider);
      const [token0, token1, reserves, totalSupply] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves(),
        pairContract.totalSupply()
      ]);
      console.log('\nPair Info:');
      console.log('Token0:', token0);
      console.log('Token1:', token1);
      console.log('Reserves:', {
        token0: ethers.formatEther(reserves[0]),
        token1: ethers.formatEther(reserves[1])
      });
      console.log('Total LP Supply:', ethers.formatEther(totalSupply));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkToken(); 