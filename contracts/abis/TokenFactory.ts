export const TokenFactoryABI = [
  {
    "inputs": [
      {
        "components": [
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "totalSupply", "type": "uint256" },
          { "name": "decimals", "type": "uint8" },
          { "name": "antiBot", "type": "bool" },
          { "name": "maxTransferAmount", "type": "uint256" },
          { "name": "cooldownTime", "type": "uint256" },
          // ... other parameters matching your contract
        ],
        "name": "tokenParams",
        "type": "tuple"
      }
    ],
    "name": "createToken",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // ... other contract functions
]; 