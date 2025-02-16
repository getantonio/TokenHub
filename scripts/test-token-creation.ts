const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Testing with account:", deployer.address);
        console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

        // Get factory contract
        const factoryAddress = "0x2619c799294E799060e8f213Fb11a9b55293bE47";
        const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factory = Factory.attach(factoryAddress).connect(deployer);

        // Calculate trading start time (5 minutes from now)
        const tradingStartTime = Math.floor(Date.now() / 1000) + 300;
        console.log("Trading will start at:", new Date(tradingStartTime * 1000).toLocaleString());

        // Token parameters
        const params = {
            name: "Test Token",
            symbol: "TEST",
            totalSupply: ethers.parseEther("100000"), // 100K tokens for safer testing
            initialLiquidityInETH: ethers.parseEther("0.1"),
            listingPriceInETH: ethers.parseEther("0.0001"), // Higher price for less tokens
            maxTxAmount: ethers.parseEther("10000"), // 10% of total supply
            maxWalletAmount: ethers.parseEther("20000"), // 20% of total supply
            enableTrading: true,
            tradingStartTime: tradingStartTime,
            dexName: "uniswap-test", // Updated to match the configured DEX
            marketingFeePercentage: 2,
            marketingWallet: deployer.address,
            developmentFeePercentage: 2,
            developmentWallet: deployer.address,
            autoLiquidityFeePercentage: 1
        };

        // Debug: Print all parameters
        console.log("\nToken Parameters:");
        Object.entries(params).forEach(([key, value]) => {
            console.log(`${key}:`, value.toString());
        });

        // Get listing fee
        const listingFee = await factory.getListingFee();
        console.log("\nListing fee:", ethers.formatEther(listingFee), "ETH");

        // Calculate total value needed
        const totalValue = params.initialLiquidityInETH + listingFee;
        console.log("Total value needed:", ethers.formatEther(totalValue), "ETH");

        // Verify DEX configuration
        const dexInfo = await factory.getDEXRouter(params.dexName);
        console.log("\nDEX Configuration:");
        console.log("Name:", dexInfo.name);
        console.log("Router:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");
        console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Send transaction
        console.log("\nSending transaction...");
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

        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\nTransaction confirmed!");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
        console.log("Total cost:", ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "ETH");

        // Check for events
        console.log("\nChecking for events...");
        for (const log of receipt.logs) {
            try {
                const decoded = factory.interface.parseLog(log);
                if (decoded) {
                    console.log("\nEvent:", decoded.name);
                    console.log("Arguments:", decoded.args);
                }
            } catch (e) {
                // Skip logs that can't be decoded
            }
        }

    } catch (error) {
        console.error("\nError in script execution:");
        console.error("Error details:", error);
        
        if (error.data) {
            try {
                const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
                const decodedError = Factory.interface.parseError(error.data);
                if (decodedError) {
                    console.error("\nDecoded Custom Error:");
                    console.error("Error Name:", decodedError.name);
                    console.error("Error Arguments:", decodedError.args);
                    
                    // Additional error context based on error name
                    switch (decodedError.name) {
                        case "InsufficientETH":
                            console.error("Required ETH:", ethers.formatEther(decodedError.args.required));
                            console.error("Provided ETH:", ethers.formatEther(decodedError.args.provided));
                            break;
                        case "DEXNotAvailable":
                            console.error("Requested DEX:", decodedError.args.dexName);
                            break;
                        case "FeesTooHigh":
                            console.error("Total Fees:", decodedError.args.totalFees.toString(), "%");
                            break;
                        case "InvalidTokenSupply":
                            console.error("Provided Supply:", ethers.formatEther(decodedError.args.supply));
                            break;
                    }
                }
            } catch (decodeError) {
                console.error("\nFailed to decode error:", error.data);
                console.error("Decode error:", decodeError);
            }
        }
        
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