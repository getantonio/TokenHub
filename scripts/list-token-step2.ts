const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    try {
        // Load token info from step 1
        if (!fs.existsSync("token-info.json")) {
            throw new Error("token-info.json not found. Please run step 1 first.");
        }
        const tokenInfo = JSON.parse(fs.readFileSync("token-info.json"));
        console.log("Loaded token info:", tokenInfo);

        // Get signer
        const [deployer] = await ethers.getSigners();
        console.log("\nListing token with account:", deployer.address);
        console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

        // Contract info
        const factoryAddress = "0x2619c799294E799060e8f213Fb11a9b55293bE47";
        
        // Get contract instances
        const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factory = new ethers.Contract(factoryAddress, Factory.interface, deployer);
        
        const Token = await ethers.getContractFactory("TokenTemplate_v2DirectDEX");
        const token = Token.attach(tokenInfo.address);

        // Prepare listing parameters
        const listingParams = {
            tokenAddress: tokenInfo.address,
            initialLiquidityInETH: ethers.parseEther("0.1"), // 0.1 ETH
            listingPriceInETH: ethers.parseEther("0.0001"), // 0.0001 ETH per token
            dexName: "uniswap-test"
        };

        // Get listing fee
        const listingFee = await factory.listingFee();
        console.log("\nListing fee:", ethers.formatEther(listingFee), "ETH");

        // Calculate total value needed
        const totalValue = listingParams.initialLiquidityInETH + listingFee;
        console.log("Total value needed:", ethers.formatEther(totalValue), "ETH");

        // Verify DEX configuration
        const dexInfo = await factory.getDEXRouter(listingParams.dexName);
        console.log("\nDEX Configuration:");
        console.log("Name:", dexInfo.name);
        console.log("Router:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

        if (!dexInfo.isActive) {
            throw new Error("Selected DEX is not active");
        }

        // Calculate tokens needed for liquidity (20% of total supply)
        const tokensForLiquidity = ethers.parseEther("20000"); // 20% of 100,000
        
        // Check token allowance and approve if needed
        const allowance = await token.allowance(deployer.address, factoryAddress);
        if (allowance < tokensForLiquidity) {
            console.log("\nApproving tokens for liquidity...");
            const approveTx = await token.approve(factoryAddress, tokensForLiquidity);
            await approveTx.wait();
            console.log("Token approval confirmed");
        }

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");
        console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // List token on DEX
        console.log("\nListing token on DEX...");
        const tx = await factory.listTokenOnDEX(
            listingParams.tokenAddress,
            listingParams.initialLiquidityInETH,
            listingParams.listingPriceInETH,
            listingParams.dexName,
            {
                value: totalValue,
                gasLimit: 5000000,
                gasPrice: gasPrice
            }
        );

        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("\nTransaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
        console.log("Total cost:", ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "ETH");

        // Parse logs
        console.log("\nChecking for events...");
        for (const log of receipt.logs) {
            try {
                const parsedLog = factory.interface.parseLog(log);
                if (parsedLog) {
                    console.log("\nEvent:", parsedLog.name);
                    console.log("Arguments:", parsedLog.args);
                }
            } catch (e) {
                // Skip logs that can't be parsed
            }
        }

        // Save listing info
        const listingInfo = {
            ...tokenInfo,
            dex: listingParams.dexName,
            initialLiquidity: ethers.formatEther(listingParams.initialLiquidityInETH),
            listingPrice: ethers.formatEther(listingParams.listingPriceInETH),
            listingTime: new Date().toISOString(),
            transactionHash: tx.hash
        };

        fs.writeFileSync(
            "listing-info.json",
            JSON.stringify(listingInfo, null, 2)
        );
        console.log("\nListing info saved to listing-info.json");

    } catch (error) {
        console.error("\nError listing token:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 