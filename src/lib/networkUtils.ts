// Network utility functions

/**
 * Get the explorer URL for a given chain ID
 * @param chainId 
 * @returns The explorer URL
 */
export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return 'https://etherscan.io';
    case 5: // Goerli Testnet
      return 'https://goerli.etherscan.io';
    case 11155111: // Sepolia Testnet
      return 'https://sepolia.etherscan.io';
    case 56: // BSC Mainnet
      return 'https://bscscan.com';
    case 97: // BSC Testnet
      return 'https://testnet.bscscan.com';
    case 42161: // Arbitrum One
      return 'https://arbiscan.io';
    case 80001: // Mumbai Testnet
      return 'https://mumbai.polygonscan.com';
    case 137: // Polygon Mainnet
      return 'https://polygonscan.com';
    case 421614: // Polygon Amoy Testnet
      return 'https://www.oklink.com/amoy';
    default:
      return 'https://etherscan.io';
  }
}

/**
 * Get network contract address based on chainId
 * @param chainId 
 * @param contractKey 
 * @returns Contract address
 */
export function getNetworkContractAddress(chainId: number, contractKey: string): string {
  const contracts: Record<number, Record<string, string>> = {
    // Sepolia Testnet
    11155111: {
      FACTORY_ADDRESS_V4: '0x8e33Ca125C08AE894f0689Cbf08f489491A3Ae36',
      ROUTER_ADDRESS: '0x8c14b6e3aF34F17D0B5B10f63a037F7c2237d069',
      MULTICALL_ADDRESS: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
    // BSC Testnet
    97: {
      FACTORY_ADDRESS_V4: '0xB0fF09f6858397773Bb0F16655C4D87C963E3729',
      ROUTER_ADDRESS: '0x6f0F318f409290fA71A19b1A9f243C7E0a26e166',
      MULTICALL_ADDRESS: '0x8F3273Fb89B075b1645095ABaC6ed17B2d4Bc576',
    },
    // Polygon Amoy Testnet
    421614: {
      FACTORY_ADDRESS_V4: '0x62a5a61301261f787c71835ed07f12789e600c27',
      ROUTER_ADDRESS: '0x955B5C642e0e250ADD56E75E12e14AD6FB4f3Eb0',
      MULTICALL_ADDRESS: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  };

  // Return address or empty string if not found
  return contracts[chainId]?.[contractKey] || '';
} 