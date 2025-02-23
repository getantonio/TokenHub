const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Checking token details...");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const tokenAddress = "0xfc063783de2d7fcdee029d460b3b7509ffe57947";
    console.log("Checking token:", tokenAddress);

    // Basic ERC20 interface
    const abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)"
    ];

    const token = new ethers.Contract(tokenAddress, abi, deployer);

    // Get token details
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const balance = await token.balanceOf(deployer.address);

    console.log("\nToken Details:");
    console.log("-------------");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("Your Balance:", ethers.formatEther(balance));

  } catch (error) {
    console.error("Error details:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 