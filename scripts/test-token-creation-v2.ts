const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    try {
        // Get signer
        const [deployer] = await ethers.getSigners();
        console.log("Testing with account:", deployer.address);
        console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

        // Contract info
        const factoryAddress = "0x2619c799294E799060e8f213Fb11a9b55293bE47";
        const abi = [
            "function createAndListToken((string,string,uint256,uint256,uint256,uint256,uint256,bool,uint256,string,uint256,address,uint256,address,uint256)) external payable returns (address)",
            "function getListingFee() external view returns (uint256)",
            "function getDEXRouter(string) external view returns (tuple(string,address,bool))"
        ];

        // Create contract instance
        const factory = new ethers.Contract(factoryAddress, abi, deployer);

        // Calculate trading start time (5 minutes from now)
        const tradingStartTime = Math.floor(Date.now() / 1000) + 300;
        console.log("Trading will start at:", new Date(tradingStartTime * 1000).toLocaleString());

        // Get listing fee
        const listingFee = await factory.getListingFee();
        console.log("\nListing fee:", ethers.formatEther(listingFee), "ETH");

        // Verify DEX configuration
        const dexInfo = await factory.getDEXRouter("uniswap-test");
        console.log("\nDEX Configuration:");
        console.log("Router:", dexInfo[1]); // address
        console.log("Is Active:", dexInfo[2]); // isActive

        // Prepare parameters
        const params = {
            name: "Test Token",
            symbol: "TEST",
            totalSupply: ethers.parseEther("100000"), // 100K tokens
            initialLiquidityInETH: ethers.parseEther("0.1"),
            listingPriceInETH: ethers.parseEther("0.0001"),
            maxTxAmount: ethers.parseEther("10000"), // 10% of total
            maxWalletAmount: ethers.parseEther("20000"), // 20% of total
            enableTrading: true,
            tradingStartTime: tradingStartTime,
            dexName: "uniswap-test",
            marketingFeePercentage: 2,
            marketingWallet: deployer.address,
            developmentFeePercentage: 2,
            developmentWallet: deployer.address,
            autoLiquidityFeePercentage: 1
        };

        // Calculate total value needed
        const totalValue = params.initialLiquidityInETH + listingFee;
        console.log("Total value needed:", ethers.formatEther(totalValue), "ETH");

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");
        console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Create transaction
        const tx = await factory.createAndListToken(
            [
                params.name,
                params.symbol,
                params.totalSupply,
                params.initialLiquidityInETH,
                params.listingPriceInETH,
                params.maxTxAmount,
                params.maxWalletAmount,
                params.enableTrading,
                params.tradingStartTime,
                params.dexName,
                params.marketingFeePercentage,
                params.marketingWallet,
                params.developmentFeePercentage,
                params.developmentWallet,
                params.autoLiquidityFeePercentage
            ],
            {
                value: totalValue,
                gasLimit: 5000000,
                gasPrice: gasPrice
            }
        );

        console.log("\nTransaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("\nTransaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
        console.log("Total cost:", ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "ETH");

    } catch (error) {
        console.error("\nError in script execution:");
        console.error("Error details:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 