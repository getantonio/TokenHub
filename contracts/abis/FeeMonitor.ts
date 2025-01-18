export const FeeMonitorABI = [
  {
    "inputs": [],
    "name": "getAnalytics",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_totalFees",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalDeployments",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "deployer",
            "type": "address"
          }
        ],
        "internalType": "struct FeeMonitor.FeeTransaction[]",
        "name": "_recentTransactions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "deployer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "recordFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]; 