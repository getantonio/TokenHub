const { ethers } = require("ethers");
const TokenFactoryV2BakeABI = require("../src/contracts/abi/TokenFactory_v2_Bake.json");
require("dotenv").config();

async function main() {
  // Get environment variables
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
  
  if (!FACTORY_ADDRESS) {
    throw new Error("Bake factory address not set in environment variables");
  }

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in environment variables");
  }

  if (!INFURA_PROJECT_ID) {
    throw new Error("INFURA_PROJECT_ID not set in environment variables");
  }

  console.log("Configuring DEXes for factory at:", FACTORY_ADDRESS);

  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Configuring with account:", wallet.address);

  // Create contract instance
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    TokenFactoryV2BakeABI.abi,
    wallet
  );

  // Uniswap Sepolia V2 Router address
  const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  
  // PancakeSwap Sepolia Router address (you'll need to replace this with the correct address)
  const PANCAKESWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  try {
    // Add Uniswap
    console.log("Adding Uniswap...");
    const uniswapTx = await factory.addDEX(
      "uniswap-test",
      UNISWAP_ROUTER
    );
    await uniswapTx.wait();
    console.log("Uniswap added successfully");

    // Add PancakeSwap
    console.log("Adding PancakeSwap...");
    const pancakeswapTx = await factory.addDEX(
      "pancakeswap-test",
      PANCAKESWAP_ROUTER
    );
    await pancakeswapTx.wait();
    console.log("PancakeSwap added successfully");

    // Now update them to be active
    console.log("Activating Uniswap...");
    const uniswapUpdateTx = await factory.updateDEX(
      "uniswap-test",
      UNISWAP_ROUTER,
      true
    );
    await uniswapUpdateTx.wait();
    console.log("Uniswap activated successfully");

    console.log("Activating PancakeSwap...");
    const pancakeswapUpdateTx = await factory.updateDEX(
      "pancakeswap-test",
      PANCAKESWAP_ROUTER,
      true
    );
    await pancakeswapUpdateTx.wait();
    console.log("PancakeSwap activated successfully");

    // Verify the configurations
    const uniswapInfo = await factory.getDEXRouter("uniswap-test");
    const pancakeswapInfo = await factory.getDEXRouter("pancakeswap-test");

    console.log("\nDEX Configurations:");
    console.log("Uniswap:", {
      name: "uniswap-test",
      router: uniswapInfo.router,
      isActive: uniswapInfo.isActive
    });
    console.log("PancakeSwap:", {
      name: "pancakeswap-test",
      router: pancakeswapInfo.router,
      isActive: pancakeswapInfo.isActive
    });

  } catch (error) {
    console.error("Error configuring DEXes:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
