// No @stacks/network imports needed here anymore

export interface StacksNetworkConfig {
  type: 'stacks';
  name: string;
  chainId: number;
  isTestnet: boolean;
  // network property removed - will be handled dynamically in context
  rpcUrl: string;
  explorerUrl: string;
}

export const STACKS_MAINNET_CONFIG: StacksNetworkConfig = {
  type: 'stacks',
  name: 'Stacks Mainnet',
  chainId: 1,
  isTestnet: false,
  // network property removed
  rpcUrl: 'https://stacks-node-api.mainnet.stacks.co',
  explorerUrl: 'https://explorer.stacks.co',
};

export const STACKS_TESTNET_CONFIG: StacksNetworkConfig = {
  type: 'stacks',
  name: 'Stacks Testnet',
  chainId: 2147483648,
  isTestnet: true,
  // network property removed
  rpcUrl: 'https://stacks-node-api.testnet.stacks.co',
  explorerUrl: 'https://explorer.stacks.co/?chain=testnet',
};

export const STACKS_NETWORKS = {
  [STACKS_MAINNET_CONFIG.chainId]: STACKS_MAINNET_CONFIG,
  [STACKS_TESTNET_CONFIG.chainId]: STACKS_TESTNET_CONFIG,
} as const;

export type StacksNetworkId = keyof typeof STACKS_NETWORKS;

// Re-export renamed config objects if needed elsewhere, or update references
export { STACKS_MAINNET_CONFIG as STACKS_MAINNET, STACKS_TESTNET_CONFIG as STACKS_TESTNET }; 