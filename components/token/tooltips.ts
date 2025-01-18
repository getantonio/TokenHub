export const tooltips = {
  name: "The full name of your token (e.g., 'Ethereum'). This will be displayed on exchanges and wallets.",
  symbol: "A short identifier for your token (e.g., 'ETH'). Usually 3-4 characters, maximum 6.",
  totalSupply: "The total number of tokens that will ever exist. This cannot be changed after creation.",
  initialPrice: "The initial price of your token in ETH. This sets the starting market value.",
  presaleAllocation: `Percentage of tokens reserved for the presale phase. These tokens will be:
  • Sold to early investors
  • Usually at a discounted price
  • Helps raise initial capital
  Recommended: 40-60%`,
  liquidityAllocation: `Percentage of tokens allocated to provide trading liquidity:
  • Added to decentralized exchanges (DEX)
  • Enables trading after launch
  • Higher liquidity = more stable price
  Recommended: 20-30%`,
  teamAllocation: `Tokens reserved for team and development:
  • Subject to vesting schedule
  • Incentivizes long-term commitment
  • Used for future development
  Recommended: 10-15%`,
  marketingAllocation: `Tokens allocated for marketing and growth:
  • Community rewards
  • Partnerships and promotions
  • Exchange listings
  Recommended: 5-15%`,
  maxTransferAmount: "Maximum amount of tokens that can be transferred in a single transaction. Helps prevent dumping.",
  antiBot: "Implements measures to prevent automated trading bots from manipulating the token price at launch.",
  transfersEnabled: "If enabled, tokens can be transferred immediately after launch. If disabled, transfers start locked.",
  vestingDuration: "The total time period over which team tokens will be released. For example, 12 months means tokens are gradually unlocked over a year.",
  vestingCliff: "Initial period where no tokens are unlocked. For example, a 3-month cliff means team members must wait 3 months before any tokens start unlocking.",
  vestingExample: "Example: With 12 months duration and 3 months cliff:\n- 0-3 months: No tokens unlocked\n- 3-12 months: Tokens unlock gradually\n- After 12 months: All tokens unlocked",
  teamVesting: "Vesting is a mechanism to gradually release tokens to team members over time, ensuring long-term commitment.",
  distribution: `How your token's total supply will be allocated across different purposes.

Example Distribution:
• Presale: 50% - For early investors
• Liquidity: 30% - For trading on DEX
• Team: 10% - Vested over time
• Marketing: 10% - For growth`,
};

export const networkTooltips = {
  ethereum: {
    title: "Ethereum Mainnet",
    requirements: "Requires ETH for gas fees (0.5 ETH recommended)",
    warning: "High gas fees, best for final deployment",
    faucet: null
  },
  polygon: {
    title: "Polygon Network",
    requirements: "Requires MATIC for gas fees (5 MATIC recommended)",
    warning: "Ensure you have MATIC tokens, not just ETH",
    faucet: "https://faucet.polygon.technology/"
  },
  sepolia: {
    title: "Sepolia Testnet",
    requirements: "Requires Sepolia ETH (0.1 ETH recommended)",
    warning: "Test network only - tokens have no real value",
    faucet: "https://sepoliafaucet.com/"
  },
  // ... add other networks
}; 