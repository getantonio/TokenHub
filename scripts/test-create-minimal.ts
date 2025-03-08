const hre = require("hardhat");
const { ethers } = require("hardhat");

// Helper function to safely serialize BigInt values
const safeStringify = (obj) => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  
  // Contract address
  const factoryAddress = "0xEB397F902BE95cEDCfCA3CC14c215cd32a696408";
  
  // Get the ABI from the compiled contract
  const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
  const factory = Factory.attach(factoryAddress);
  
  // Minimal parameters
  const tokenParams = {
    name: "TestToken",
    symbol: "TEST",
    totalSupply: ethers.parseEther("1000000"),
    maxTxAmount: ethers.parseEther("1000000"),
    maxWalletAmount: ethers.parseEther("1000000"),
    enableTrading: true,
    tradingStartTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
    marketingFeePercentage: BigInt(1),
    marketingWallet: "0x10C8c279c6b381156733ec160A89Abb260bfcf0C",
    developmentFeePercentage: BigInt(1),
    developmentWallet: "0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD",
    autoLiquidityFeePercentage: BigInt(1),
    enableBuyFees: true,
    enableSellFees: true
  };
  
  try {
    // Get listing fee
    const listingFee = await factory.listingFee();
    console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");
    
    // Try to create token
    console.log("Creating token with parameters:");
    console.log(safeStringify(tokenParams));
    
    const tx = await factory.createToken(tokenParams, { value: listingFee });
    console.log("Transaction sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed, status:", receipt.status);
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
