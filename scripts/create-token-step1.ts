const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    try {
        // Get signer
        const [deployer] = await ethers.getSigners();
        console.log("Creating token with account:", deployer.address);
        console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

        // Contract info
        const factoryAddress = "0x2619c799294E799060e8f213Fb11a9b55293bE47";
        
        // Get contract instance
        const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factory = new ethers.Contract(factoryAddress, Factory.interface, deployer);

        // Calculate trading start time (5 minutes from now)
        const tradingStartTime = Math.floor(Date.now() / 1000) + 300;
        console.log("Trading will start at:", new Date(tradingStartTime * 1000).toLocaleString());

        // Prepare token parameters
        const params = {
            name: "Test Token",
            symbol: "TEST",
            totalSupply: ethers.parseEther("100000"), // 100,000 tokens
            maxTxAmount: ethers.parseEther("10000"), // 10% of total
            maxWalletAmount: ethers.parseEther("20000"), // 20% of total
            enableTrading: false, // Will be enabled during DEX listing
            tradingStartTime: tradingStartTime,
            marketingFeePercentage: 2,
            marketingWallet: deployer.address,
            developmentFeePercentage: 2,
            developmentWallet: deployer.address,
            autoLiquidityFeePercentage: 1
        };

        // Log parameters
        console.log("\nToken Parameters:");
        console.log("Name:", params.name);
        console.log("Symbol:", params.symbol);
        console.log("Total Supply:", ethers.formatEther(params.totalSupply), "tokens");
        console.log("Max Transaction:", ethers.formatEther(params.maxTxAmount), "tokens");
        console.log("Max Wallet:", ethers.formatEther(params.maxWalletAmount), "tokens");
        console.log("Trading Enabled:", params.enableTrading);
        console.log("Trading Start Time:", new Date(params.tradingStartTime * 1000).toLocaleString());
        console.log("Marketing Fee:", params.marketingFeePercentage, "%");
        console.log("Development Fee:", params.developmentFeePercentage, "%");
        console.log("Auto-Liquidity Fee:", params.autoLiquidityFeePercentage, "%");

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");
        console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Create token
        console.log("\nCreating token...");
        const tx = await factory.createToken(
            params,
            {
                gasLimit: 3000000,
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

        // Parse logs to get token address
        const tokenCreatedEvent = receipt.logs
            .map(log => {
                try {
                    return factory.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find(event => event && event.name === "TokenCreated");

        if (tokenCreatedEvent) {
            const tokenAddress = tokenCreatedEvent.args.token;
            console.log("\nToken created successfully!");
            console.log("Token address:", tokenAddress);
            console.log("Owner:", tokenCreatedEvent.args.owner);

            // Save token info for step 2
            const tokenInfo = {
                address: tokenAddress,
                name: params.name,
                symbol: params.symbol,
                totalSupply: params.totalSupply.toString(),
                owner: tokenCreatedEvent.args.owner,
                creationTime: new Date().toISOString()
            };

            // Save to file for use in step 2
            const fs = require("fs");
            fs.writeFileSync(
                "token-info.json",
                JSON.stringify(tokenInfo, null, 2)
            );
            console.log("\nToken info saved to token-info.json");
        } else {
            throw new Error("Token creation failed - no TokenCreated event found");
        }

    } catch (error) {
        console.error("\nError creating token:");
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