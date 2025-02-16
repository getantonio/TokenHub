const hre = require('hardhat');
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Import the full contract ABI from artifacts
const factoryArtifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../artifacts/src/contracts/TokenFactory_v2_DirectDEX.sol/TokenFactory_v2_DirectDEX.json')
));

async function main() {
    try {
        const [signer] = await ethers.getSigners();
        console.log("Creating token with account:", signer.address);
        
        const FACTORY_ADDRESS = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";

        // Get the factory contract
        const factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factoryContract = factory.attach(FACTORY_ADDRESS);

        // Get listing fee
        const listingFee = await factoryContract.getListingFee();
        console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");

        // Calculate trading start time (5 minutes from now)
        const tradingStartTime = Math.floor(Date.now() / 1000) + 300;
        console.log("Trading will start at:", new Date(tradingStartTime * 1000).toLocaleString());

        // Token parameters
        const params = {
            name: "Test Token",
            symbol: "TEST",
            totalSupply: ethers.parseEther("1000000"), // 1M tokens
            initialLiquidityInETH: ethers.parseEther("0.1"), // 0.1 ETH
            listingPriceInETH: ethers.parseEther("0.0000001"), // Initial price
            maxTxAmount: ethers.parseEther("10000"), // 1% of total
            maxWalletAmount: ethers.parseEther("20000"), // 2% of total
            enableTrading: true,
            tradingStartTime: tradingStartTime,
            dexName: "uniswap-test",
            marketingFeePercentage: 5,
            marketingWallet: "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F",
            developmentFeePercentage: 3,
            developmentWallet: "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F",
            autoLiquidityFeePercentage: 2
        };

        // Log parameters
        console.log("\nToken Parameters:");
        console.log("Name:", params.name);
        console.log("Symbol:", params.symbol);
        console.log("Total Supply:", ethers.formatEther(params.totalSupply), "tokens");
        console.log("Initial Liquidity:", ethers.formatEther(params.initialLiquidityInETH), "ETH");
        console.log("Listing Price:", ethers.formatEther(params.listingPriceInETH), "ETH per token");
        console.log("Max Transaction:", ethers.formatEther(params.maxTxAmount), "tokens");
        console.log("Max Wallet:", ethers.formatEther(params.maxWalletAmount), "tokens");
        console.log("Trading Enabled:", params.enableTrading);
        console.log("Trading Start Time:", new Date(params.tradingStartTime * 1000).toLocaleString());
        console.log("DEX:", params.dexName);
        console.log("Marketing Fee:", params.marketingFeePercentage, "%");
        console.log("Development Fee:", params.developmentFeePercentage, "%");
        console.log("Auto-Liquidity Fee:", params.autoLiquidityFeePercentage, "%");

        // Verify DEX configuration
        const dexInfo = await factoryContract.getDEXRouter(params.dexName);
        console.log("\nVerified DEX configuration:");
        console.log("DEX Name:", dexInfo.name);
        console.log("Router Address:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

        if (!dexInfo.isActive) {
            throw new Error("Selected DEX is not active");
        }

        // Calculate total value needed
        const totalValue = listingFee + params.initialLiquidityInETH;
        console.log("\nTotal value needed:", ethers.formatEther(totalValue), "ETH");

        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        console.log("\nCurrent gas prices:");
        console.log("maxFeePerGas:", ethers.formatUnits(feeData.maxFeePerGas || 0, "gwei"), "gwei");
        console.log("maxPriorityFeePerGas:", ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, "gwei"), "gwei");

        // Calculate reasonable gas parameters
        const baseGasPrice = feeData.maxFeePerGas || ethers.parseUnits("3", "gwei");
        const priorityFee = feeData.maxPriorityFeePerGas || ethers.parseUnits("1.5", "gwei");
        const maxFeePerGas = baseGasPrice + priorityFee;

        // Create interface from ABI
        const iface = new ethers.Interface(factoryArtifact.abi);

        // Encode function call with parameters
        const data = iface.encodeFunctionData("createAndListToken", [[
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
        ]]);

        // Create transaction object
        const txRequest = {
            to: FACTORY_ADDRESS,
            from: signer.address,
            data: data,
            value: totalValue,
            gasLimit: 5000000,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: priorityFee,
            type: 2,
            chainId: (await ethers.provider.getNetwork()).chainId
        };

        // Send transaction using the signer
        console.log("\nSending transaction...");
        const tx = await signer.sendTransaction(txRequest);

        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\nTransaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Effective gas price:", ethers.formatUnits(receipt.effectiveGasPrice, "gwei"), "gwei");
        console.log("Total cost in ETH:", ethers.formatEther(receipt.gasUsed * receipt.effectiveGasPrice));

        // Check for TokenListed event
        const tokenListedEvents = receipt.logs.filter(log => {
            try {
                const decoded = factoryContract.interface.parseLog(log);
                return decoded.name === "TokenListed";
            } catch (e) {
                return false;
            }
        });

        if (tokenListedEvents.length > 0) {
            const event = factoryContract.interface.parseLog(tokenListedEvents[0]);
            console.log("\nToken created successfully!");
            console.log("Token address:", event.args.token);
            console.log("Owner:", event.args.owner);
            console.log("DEX:", event.args.dexName);
            console.log("Initial liquidity:", ethers.formatEther(event.args.initialLiquidity), "ETH");
            console.log("Listing price:", ethers.formatEther(event.args.listingPrice), "ETH");
            console.log("Trading start time:", new Date(Number(event.args.tradingStartTime) * 1000).toLocaleString());
        } else {
            throw new Error("Token creation failed - no TokenListed event found");
        }
    } catch (error) {
        console.error("\nError creating token:");
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        if (error.transaction) console.error("Transaction:", error.transaction);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 