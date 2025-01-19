export const NETWORKS_WITH_COSTS = [
  {
    id: 1,
    name: 'Ethereum',
    costs: {
      tokenDeployment: '150',
      vestingDeployment: '250',
      total: '400'
    },
    rpcUrls: ['https://mainnet.infura.io/v3/your-project-id'],
    blockExplorers: {
      default: {
        name: 'Etherscan',
        url: 'https://etherscan.io'
      }
    }
  },
  {
    id: 11155111,
    name: 'Sepolia (Testnet)',
    costs: {
      tokenDeployment: '0',
      vestingDeployment: '0',
      total: '0'
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorers: {
      default: {
        name: 'Sepolia Etherscan',
        url: 'https://sepolia.etherscan.io'
      }
    }
  },
  {
    id: 31337,
    name: 'Local Testnet',
    costs: {
      tokenDeployment: '0',
      vestingDeployment: '0',
      total: '0'
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorers: undefined
  }
] as const;

export type NetworkConfig = typeof NETWORKS_WITH_COSTS[number];