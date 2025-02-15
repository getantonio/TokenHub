const { ethers } = require('hardhat');

async function main() {
  const factoryAddress = '0xE5dB0C6eF854ace899f970794541F5b351d0341F';
  const factory = await ethers.getContractAt('TokenFactory_v2_DirectDEX', factoryAddress);
  
  console.log('Getting listing fee...');
  const listingFee = await factory.getListingFee();
  console.log(`Listing fee: ${ethers.formatEther(listingFee)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 