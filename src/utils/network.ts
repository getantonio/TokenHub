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