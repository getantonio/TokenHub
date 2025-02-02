# Token Creation Guide

This guide explains the token creation process and the features you can enable during token deployment.

## Creation Fee Structure

Base fee: $100 USD equivalent in ETH
Additional fees:
- Anti-Bot Protection: +50% of base fee
- Vesting Features: +25% of base fee

## Token Configuration Options

### Basic Token Information
```solidity
struct TokenConfig {
    string name;        // Token name
    string symbol;      // Token symbol
    uint256 maxSupply;  // Maximum total supply
    uint256 initialSupply; // Initial circulating supply
    uint256 tokenPrice; // Initial token price
}
```

### Transfer Restrictions
```solidity
// Transfer limits
uint256 maxTransferAmount;  // Maximum amount per transfer (0 for no limit)
uint256 cooldownTime;       // Time between transfers (0 for no cooldown)
bool transfersEnabled;      // Enable/disable all transfers
bool antiBot;              // Enable anti-bot protection at launch
```

### Token Distribution
All allocations are in percentages (1-100):

```solidity
// Team allocation
uint256 teamAllocation;        // Max 30%
uint256 teamVestingDuration;   // In months
uint256 teamVestingCliff;      // In months
address teamWallet;

// Marketing allocation
uint256 marketingAllocation;   // Max 15%
address marketingWallet;

// Developer allocation
uint256 developerAllocation;   // Max 10%
address developerWallet;

// Liquidity allocation
uint256 liquidityAllocation;   // Max 50%
uint256 liquidityLockDuration; // Minimum 180 days
```

## Allocation Limits

1. **Team Allocation**
   - Minimum: 1%
   - Maximum: 30%
   - Optional vesting schedule

2. **Marketing Allocation**
   - Maximum: 15%
   - Instant unlock
   - Requires valid wallet address

3. **Developer Allocation**
   - Maximum: 10%
   - Instant unlock
   - Requires valid wallet address

4. **Liquidity Allocation**
   - Maximum: 50%
   - Minimum lock: 180 days
   - Automatic locking on creation

5. **Platform Fee**
   - Fixed: 2%
   - Automatically allocated

## Example Creation

```javascript
const tokenConfig = {
    name: "My Token",
    symbol: "MTK",
    maxSupply: "1000000000000000000000000", // 1 million tokens
    initialSupply: "500000000000000000000000", // 500k tokens
    tokenPrice: "1000000000000000", // 0.001 ETH
    maxTransferAmount: "10000000000000000000000", // 10k tokens
    cooldownTime: 300, // 5 minutes
    transfersEnabled: true,
    antiBot: true,
    
    // Team allocation with 12-month vesting, 2-month cliff
    teamAllocation: 20,
    teamVestingDuration: 12,
    teamVestingCliff: 2,
    teamWallet: "0x...",
    
    // Marketing and Developer allocations
    marketingAllocation: 10,
    marketingWallet: "0x...",
    developerAllocation: 5,
    developerWallet: "0x...",
    
    // Liquidity allocation
    liquidityAllocation: 40,
    liquidityLockDuration: 180 // days
};

// Calculate total fee
const fee = await factory.calculateTotalFee(tokenConfig, creator);

// Create token
await factory.createToken(tokenConfig, { value: fee });
```

## Post-Creation Steps

1. **Immediate Actions**
   - Verify token on blockchain explorer
   - Add liquidity if required
   - Configure additional security settings

2. **Within 24 Hours**
   - Set up transfer limits
   - Configure fee system
   - Add emergency admins

3. **Within First Week**
   - Monitor token metrics
   - Adjust parameters as needed
   - Enable governance features

## Important Notes

1. **Fees**
   - All fees must be paid in ETH
   - Fee amount varies with ETH price
   - No refunds for failed deployments

2. **Allocations**
   - Total allocations cannot exceed 100%
   - All wallet addresses must be valid
   - Vesting is irreversible once set

3. **Security**
   - Anti-bot protection recommended for fair launch
   - Test all features on testnet first
   - Keep owner wallet secure

4. **Compliance**
   - Ensure token complies with local regulations
   - Document all configuration decisions
   - Consider legal implications of features 