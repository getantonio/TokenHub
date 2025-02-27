import { ChainId } from '@/types/chain';

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