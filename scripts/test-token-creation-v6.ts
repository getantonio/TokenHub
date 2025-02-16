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
        
        // Get contract instance
        const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factory = new ethers.Contract(factoryAddress, Factory.interface, deployer);

        // Calculate trading start time (5 minutes from now)
        const tradingStartTime = Math.floor(Date.now() / 1000) + 300;
        console.log("Trading will start at:", new Date(tradingStartTime * 1000).toLocaleString());

        // Prepare parameters as array (matching Solidity struct order)
        const params = [
            "Test Token", // name
            "TEST", // symbol
            ethers.parseEther("100000"), // totalSupply
            ethers.parseEther("0.1"), // initialLiquidityInETH
            ethers.parseEther("0.0001"), // listingPriceInETH
            ethers.parseEther("10000"), // maxTxAmount
            ethers.parseEther("20000"), // maxWalletAmount
            true, // enableTrading
            tradingStartTime, // tradingStartTime
            "uniswap-test", // dexName
            2, // marketingFeePercentage
            deployer.address, // marketingWallet
            2, // developmentFeePercentage
            deployer.address, // developmentWallet
            1 // autoLiquidityFeePercentage
        ];

        // Get listing fee
        const listingFee = await factory.listingFee();
        console.log("\nListing fee:", ethers.formatEther(listingFee), "ETH");

        // Calculate total value needed
        const totalValue = ethers.parseEther("0.1") + listingFee;
        console.log("Total value needed:", ethers.formatEther(totalValue), "ETH");

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");
        console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Create and list token
        console.log("\nCreating and listing token...");
        console.log("Parameters:", params);

        // Call the contract method directly
        const tx = await factory.createAndListToken(
            params,
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
        if (receipt.logs.length > 0) {
            console.log("\nTransaction logs:");
            for (const log of receipt.logs) {
                try {
                    const parsedLog = factory.interface.parseLog(log);
                    if (parsedLog) {
                        console.log("Event:", parsedLog.name);
                        console.log("Arguments:", parsedLog.args);
                    }
                } catch (e) {
                    // Skip logs that can't be parsed
                }
            }
        }

    } catch (error) {
        console.error("\nError in script execution:");
        console.error("Error details:", error);

        // Try to decode error data if available
        if (error.data) {
            try {
                const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
                const decodedError = Factory.interface.parseError(error.data);
                if (decodedError) {
                    console.error("\nDecoded error:");
                    console.error("Name:", decodedError.name);
                    console.error("Args:", decodedError.args);
                }
            } catch (e) {
                console.error("Could not decode error data:", error.data);
            }
        }

        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 