const { parseEther } = require("ethers");

module.exports = [
    "Test Token",                                    // name
    "TEST",                                         // symbol
    "1000000000000000000000000",                   // totalSupply (1M tokens)
    "10000000000000000000000",                     // maxTxAmount (1% of total)
    "20000000000000000000000",                     // maxWalletAmount (2% of total)
    false,                                         // enableTrading (false initially)
    1708001400,                                    // tradingStartTime (fixed timestamp)
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
    5,                                             // marketingFeePercentage (5%)
    3,                                             // developmentFeePercentage (3%)
    2,                                             // autoLiquidityFeePercentage (2%)
    "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F", // marketingWallet
    "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F", // developmentWallet
    "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F"  // autoLiquidityWallet
]; 