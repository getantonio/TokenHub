require('dotenv').config();
const { ethers } = require('ethers');
const TokenFactoryV2DirectDEXTwoStepABI = require('../src/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep.json');

async function main() {
  if (!process.env.INFURA_PROJECT_ID) {
    throw new Error('INFURA_PROJECT_ID not set in .env file');
  }

  const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
  const factoryAddress = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
  
  console.log('Checking DEXes for factory at:', factoryAddress);
  
  const factory = new ethers.Contract(
    factoryAddress,
    TokenFactoryV2DirectDEXTwoStepABI.abi,
    provider
  );

  // Get supported DEXes
  const dexNames = await factory.getSupportedDEXes();
  console.log('\nSupported DEXes:', dexNames);

  // Get info for each DEX
  for (const name of dexNames) {
    const dexInfo = await factory.getDEXRouter(name);
    console.log(`\nDEX: ${name}`);
    console.log('Router:', dexInfo.router);
    console.log('Is Active:', dexInfo.isActive);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 