const { ethers } = require("hardhat");
const { getContractAddresses } = require("./utils/contractAddresses");

async function main() {
    try {
        const network = await ethers.provider.getNetwork();
        console.log(`\nAdding liquidity on network: ${network.name} (${network.chainId})`);
        
        const addresses = await getContractAddresses();
        
        // Use a direct contract instance approach
        const tokenABI = [
            "function balanceOf(address) view returns (uint256)",
            "function addLiquidityFromContractTokens() external payable",
            "function uniswapV2Pair() view returns (address)"
        ];
        
        const [deployer] = await ethers.getSigners();
        console.log(`\nUsing deployer: ${deployer.address}`);
        console.log(`Token address: ${addresses.token}`);
        
        // Create contract instance using the ABI
        const token = new ethers.Contract(addresses.token, tokenABI, deployer);
        
        // Check token balance of contract
        const balance = await token.balanceOf(addresses.token);
        console.log(`\nToken balance in contract: ${ethers.formatEther(balance)}`);
        
        // Add liquidity with 0.001 ETH
        const ethAmount = ethers.parseEther("0.001");
        console.log(`\nAdding liquidity with ${ethers.formatEther(ethAmount)} ETH...`);
        
        const tx = await token.addLiquidityFromContractTokens({ 
            value: ethAmount,
            gasLimit: 3000000 // Set a higher gas limit
        });
        console.log(`Transaction hash: ${tx.hash}`);
        await tx.wait();
        
        console.log("Liquidity added successfully!");
        
        // Check pair address
        const pair = await token.uniswapV2Pair();
        console.log(`\nPair address: ${pair}`);

    } catch (error) {
        console.error("Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        if (error.transaction) {
            console.error("Transaction:", error.transaction);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 