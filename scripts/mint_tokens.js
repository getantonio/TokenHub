const { ethers } = require("hardhat");
const { getContractAddresses } = require("./utils/contractAddresses");

async function main() {
    try {
        const network = await ethers.provider.getNetwork();
        console.log(`\nMinting tokens on network: ${network.name} (${network.chainId})`);
        
        const addresses = await getContractAddresses();
        const token = await ethers.getContractAt("Token_v3_Updated", addresses.token);
        const [deployer] = await ethers.getSigners();
        
        console.log(`\nUsing deployer: ${deployer.address}`);
        console.log(`Token address: ${token.address}`);
        
        // Mint tokens to the liquidity contract
        const amount = ethers.parseEther("1000000"); // Mint 1M tokens
        console.log(`\nMinting ${ethers.formatEther(amount)} tokens to liquidity contract...`);
        
        const tx = await token.mint(addresses.liquidity, amount);
        await tx.wait();
        
        console.log("Tokens minted successfully!");
        
        // Check balance
        const balance = await token.balanceOf(addresses.liquidity);
        console.log(`\nLiquidity contract balance: ${ethers.formatEther(balance)} STANT`);

    } catch (error) {
        console.error("Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 