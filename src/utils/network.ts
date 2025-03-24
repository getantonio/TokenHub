import { ChainId } from '@/types/chain';
import { SUPPORTED_NETWORKS } from '@/config/networks';

export const getNetworkCurrency = (chainId: number): string => {
  switch (chainId) {
    case ChainId.BSC_TESTNET: // 97
      return 'BNB';
    case ChainId.SEPOLIA: // 11155111
      return 'ETH';
    case ChainId.POLYGON_AMOY: // 80002
      return 'MATIC';
    case ChainId.OPTIMISM_SEPOLIA: // 11155420
      return 'ETH';
    case ChainId.ARBITRUM_SEPOLIA: // 421614
      return 'ETH';
    case ChainId.BSC_MAINNET: // 56
      return 'BNB';
    case ChainId.ETHEREUM: // 1
      return 'ETH';
    default:
      return 'ETH';
  }
};

// Direct network switching function as a fallback
export const switchNetwork = async (chainId: number): Promise<boolean> => {
  if (!window.ethereum) {
    console.error('Ethereum provider not found');
    return false;
  }

  try {
    // First try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    console.log(`Successfully switched to network with chain ID: ${chainId}`);
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902 || switchError.message?.includes('wallet_addEthereumChain')) {
      try {
        const networkInfo = SUPPORTED_NETWORKS[chainId];
        if (!networkInfo) {
          console.error(`Network configuration not found for chain ID: ${chainId}`);
          return false;
        }

        const params = {
          chainId: `0x${chainId.toString(16)}`,
          chainName: networkInfo.name,
          nativeCurrency: {
            name: networkInfo.nativeCurrency?.name || 'ETH',
            symbol: networkInfo.nativeCurrency?.symbol || 'ETH',
            decimals: networkInfo.nativeCurrency?.decimals || 18,
          },
          rpcUrls: networkInfo.rpcUrls?.default?.http || [],
          blockExplorerUrls: networkInfo.blockExplorers?.default?.url ? [networkInfo.blockExplorers.default.url] : [],
        };

        console.log('Adding network with params:', params);
        
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [params],
        });
        console.log(`Successfully added and switched to network with chain ID: ${chainId}`);
        return true;
      } catch (addError) {
        console.error('Error adding chain to wallet:', addError);
        return false;
      }
    } else {
      console.error('Error switching chain:', switchError);
      return false;
    }
  }
};

// Network utility functions

/**
 * Check if the network is Polygon Amoy
 * @param chainId The chain ID to check
 * @returns Whether the network is Polygon Amoy
 */
export function isPolygonAmoyNetwork(chainId: number): boolean {
  // Polygon Amoy chain ID is 80002
  return chainId === 80002;
}

/**
 * Get the name of a network by chain ID
 * @param chainId The chain ID to get the name for
 * @returns The network name
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum Mainnet';
    case 5:
      return 'Goerli Testnet';
    case 11155111:
      return 'Sepolia Testnet';
    case 80001:
      return 'Polygon Mumbai';
    case 80002:
      return 'Polygon Amoy';
    case 137:
      return 'Polygon Mainnet';
    case 56:
      return 'BSC Mainnet';
    case 97:
      return 'BSC Testnet';
    case 421614:
      return 'Arbitrum Sepolia';
    case 11155420:
      return 'Optimism Sepolia';
    default:
      return `Unknown Network (${chainId})`;
  }
}

/**
 * Get the explorer URL for a transaction or address
 * @param chainId The chain ID
 * @param hashOrAddress The transaction hash or address
 * @returns The explorer URL
 */
export function getExplorerUrl(chainId: number, hashOrAddress: string): string {
  switch (chainId) {
    case 80002:
      return `https://www.oklink.com/amoy/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    case 11155111:
      return `https://sepolia.etherscan.io/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    case 421614:
      return `https://sepolia-explorer.arbitrum.io/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    case 11155420:
      return `https://sepolia-optimism.etherscan.io/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    case 97:
      return `https://testnet.bscscan.com/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    case 56:
      return `https://bscscan.com/${hashOrAddress.startsWith('0x') && hashOrAddress.length === 66 ? 'tx/' : 'address/'}${hashOrAddress}`;
    default:
      return '#';
  }
} 