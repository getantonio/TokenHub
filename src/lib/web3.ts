export function getExplorerUrl(address: string): string {
  // For now, default to Ethereum mainnet explorer
  return `https://etherscan.io/address/${address}`;
} 