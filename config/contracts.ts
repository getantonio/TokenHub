interface NetworkConfig {
  factoryAddress: string;
  // Add other contract addresses here as needed
}

interface ContractConfig {
  [key: number]: NetworkConfig; // chainId -> addresses
}

const contracts: ContractConfig = {
  1: { // Ethereum Mainnet
    factoryAddress: "MAINNET_FACTORY_ADDRESS",
  },
  5: { // Goerli Testnet
    factoryAddress: "GOERLI_FACTORY_ADDRESS",
  },
  11155111: { // Sepolia Testnet
    factoryAddress: "SEPOLIA_FACTORY_ADDRESS",
  },
  // Add other networks as needed
};

export const getContractAddress = (chainId: number, contractName: keyof NetworkConfig): string => {
  const network = contracts[chainId];
  if (!network) {
    throw new Error(`Network configuration not found for chainId: ${chainId}`);
  }
  return network[contractName];
};

export default contracts; 