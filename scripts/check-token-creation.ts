const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Checking with account:", deployer.address);

        // Get factory contract
        const factoryAddress = "0x9A4E84681cAF6505D61B64A64aac25455066e223";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        // Get transaction receipt
        const txHash = "0x1346896a0d262fb9576e00c06a3e15aceadecbbff2a8f304332230fa869c81d0";
        const receipt = await ethers.provider.getTransactionReceipt(txHash);
        
        if (!receipt) {
            console.log("Transaction is still pending");
            return;
        }

        console.log("\nTransaction status:", receipt.status === 1 ? "Success" : "Failed");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Block number:", receipt.blockNumber);

        // Check for TokenListed event
        const tokenListedEvents = receipt.logs.filter(log => {
            try {
                const decoded = factory.interface.parseLog(log);
                return decoded.name === "TokenListed";
            } catch (e) {
                return false;
            }
        });

        if (tokenListedEvents.length > 0) {
            const event = factory.interface.parseLog(tokenListedEvents[0]);
            console.log("\nToken created successfully!");
            console.log("Token address:", event.args.token);
            console.log("Owner:", event.args.owner);
            console.log("DEX:", event.args.dexName);
            console.log("Initial liquidity:", ethers.formatEther(event.args.initialLiquidity), "ETH");
            console.log("Listing price:", ethers.formatEther(event.args.listingPrice), "ETH");
            console.log("Trading start time:", new Date(Number(event.args.tradingStartTime) * 1000).toLocaleString());
        } else {
            console.log("\nNo TokenListed event found - token creation failed");
        }

    } catch (error) {
        console.error("\nError in script execution:");
        console.error(error);
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