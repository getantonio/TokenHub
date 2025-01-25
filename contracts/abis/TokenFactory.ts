export const TokenFactoryABI = [
  {
    "inputs": [
      {
        "components": [
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "maxSupply", "type": "uint256" },
          { "name": "initialSupply", "type": "uint256" },
          { "name": "tokenPrice", "type": "uint256" },
          { "name": "maxTransferAmount", "type": "uint256" },
          { "name": "cooldownTime", "type": "uint256" },
          { "name": "transfersEnabled", "type": "bool" },
          { "name": "antiBot", "type": "bool" },
          { "name": "teamVestingDuration", "type": "uint256" },
          { "name": "teamVestingCliff", "type": "uint256" },
          { "name": "teamAllocation", "type": "uint256" },
          { "name": "teamWallet", "type": "address" },
          { "name": "marketingAllocation", "type": "uint256" },
          { "name": "marketingWallet", "type": "address" },
          { "name": "developerAllocation", "type": "uint256" },
          { "name": "developerWallet", "type": "address" }
        ],
        "name": "config",
        "type": "tuple"
      }
    ],
    "name": "createToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creationFee",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getCreationFee",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "TokenCreated",
    "type": "event"
  }
]; 