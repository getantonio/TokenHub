const { ethers } = require("hardhat");

// Exact TokenFactory_v3 ABI, just the createToken function
const factoryABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "symbol",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "initialSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxSupply",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "enableBlacklist",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableTimeLock",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "presaleRate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "softCap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "hardCap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minContribution",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxContribution",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "presalePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liquidityPercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liquidityLockDuration",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "wallet",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "percentage",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "vestingEnabled",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "vestingDuration",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "cliffDuration",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "vestingStartTime",
                "type": "uint256"
              }
            ],
            "internalType": "struct ITokenTypes.WalletAllocation[]",
            "name": "walletAllocations",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256",
            "name": "maxActivePresales",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "presaleEnabled",
            "type": "bool"
          }
        ],
        "internalType": "struct TokenFactory_v3.TokenParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  // Get the address from environment or hardcode
  const factoryAddress = "0x07660e3b490E74a286927C7eF7219192003cFee2"; // V1 factory
  
  console.log("Trying to create token with V1 factory at:", factoryAddress);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Using account:", deployerAddress);
  
  // Check if the contract exists
  const code = await ethers.provider.getCode(factoryAddress);
  if (code === '0x') {
    console.error("❌ No contract found at this address");
    return;
  }
  
  console.log("✅ Contract code found at this address (bytecode size:", code.length, "bytes)");
  
  // Connect to the factory with the exact ABI
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Check if paused
  try {
    const isPaused = await factory.paused();
    console.log("Contract paused:", isPaused);
    
    if (isPaused) {
      console.log("❌ Contract is paused, cannot create tokens");
      return;
    }
  } catch (error) {
    console.log("Could not check if paused:", error.message);
  }
  
  // Minimum viable token parameters with the smallest possible values
  const minTokenParams = {
    name: "Micro Token",
    symbol: "MICRO",
    initialSupply: ethers.parseUnits("10", 18), // Only 10 tokens
    maxSupply: ethers.parseUnits("100", 18),
    owner: deployerAddress,
    enableBlacklist: false,
    enableTimeLock: false,
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0, 
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 0,
    liquidityLockDuration: 0,
    walletAllocations: [
      {
        wallet: deployerAddress,
        percentage: 100,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  console.log("Creating token with minimal parameters:");
  console.log("- Name:", minTokenParams.name);
  console.log("- Symbol:", minTokenParams.symbol);
  console.log("- Initial Supply:", ethers.formatUnits(minTokenParams.initialSupply));
  console.log("- Owner:", minTokenParams.owner);
  
  try {
    // Try to create a token with different fee amounts
    const fee = ethers.parseEther("0.0001"); // Try a very small fee first
    console.log("Using fee:", ethers.formatEther(fee), "MATIC");
    
    console.log("Creating token...");
    const tx = await factory.createToken(minTokenParams, {
      value: fee,
      gasLimit: 3000000 // Higher gas limit for safety
    });
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    if (receipt.status === 1) {
      console.log("✅ Token creation succeeded!");
      // Note: We'd need the event ABI to properly parse the token address
    } else {
      console.log("❌ Transaction failed on-chain");
    }
  } catch (error) {
    console.error("❌ Token creation failed:", error.message);
    
    // Try to extract more information about the error
    if (error.error) {
      if (error.error.message) {
        console.error("Error message:", error.error.message);
      }
      if (error.error.data) {
        console.error("Error data:", error.error.data);
      }
    }
    
    if (error.transaction) {
      console.log("Transaction:", {
        to: error.transaction.to,
        from: error.transaction.from,
        value: error.transaction.value.toString(),
        data: error.transaction.data ? error.transaction.data.substring(0, 66) + "..." : "none"
      });
    }
    
    if (error.receipt) {
      console.log("Gas used:", error.receipt.gasUsed.toString());
      console.log("Status:", error.receipt.status);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 