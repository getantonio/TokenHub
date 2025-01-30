# Post-Deployment Token Management Guide

This guide explains all the features available to token creators after deploying their token through our factory.

## Table of Contents
1. [Security Features](#security-features)
2. [Token Economics](#token-economics)
3. [Governance System](#governance-system)
4. [Emergency Controls](#emergency-controls)

## Security Features

### Anti-Bot Protection
- **Enable/Disable**: `setAntiBot(bool enabled)`
- **Duration**: 5 minutes after enabling
- **Restrictions**: 
  - Maximum wallet size: 2% of total supply
  - Prevents sniping and bot manipulation during launch

```solidity
// Enable anti-bot protection at launch
myToken.setAntiBot(true);
```

### Whitelist Management
- **Add/Remove**: `updateWhitelist(address account, bool status)`
- **Purpose**: Exempt trusted addresses from transfer restrictions
```solidity
// Add address to whitelist
myToken.updateWhitelist(trustedAddress, true);
```

### Transfer Limits
1. **Daily Limits**
   ```solidity
   // Set daily transfer limit for an address
   myToken.setDailyLimit(address, maxDailyAmount);
   ```

2. **Maximum Transfer Amount**
   ```solidity
   // Set maximum amount per transfer
   myToken.setMaxTransferAmount(maxAmount);
   ```

3. **Cooldown Time**
   ```solidity
   // Set cooldown between transfers
   myToken.setCooldownTime(timeInSeconds);
   ```

## Token Economics

### Fee Management
Tokens can implement three types of fees:
1. **Buyback Fee** (Default: 1%)
2. **Burn Fee** (Default: 1%)
3. **Reward Fee** (Default: 1%)

```solidity
// Update buyback and burn fees (in basis points, max 500 = 5%)
myToken.setFees(buybackFee, burnFee);

// Update reward fee (in basis points, max 500 = 5%)
myToken.setRewardFee(rewardFee);

// Exclude address from fees
myToken.setFeeExclusion(address, true);
```

### Token Burning
1. **Manual Burning**
   ```solidity
   // Burn tokens from own wallet
   myToken.burn(amount);
   
   // Burn tokens from approved wallet
   myToken.burnFrom(address, amount);
   ```

2. **Automatic Burning**
   - Occurs when collected burn fees reach threshold
   - Threshold: 0.1% of initial supply by default
   ```solidity
   // Update auto-burn threshold
   myToken.setAutoBurnThreshold(newThreshold);
   ```

### Buyback System
- Collects fees for token buybacks
- Executed manually by owner
```solidity
// Execute buyback when threshold reached
myToken.executeBuyback();

// Update buyback threshold
myToken.setBuybackThreshold(newThreshold);
```

### Reward Distribution
- Holders earn rewards based on their holdings
- Points system tracks eligibility
```solidity
// Claim available rewards
myToken.claimRewards();
```

### Token Locking
```solidity
// Lock tokens
myToken.lockTokens(address, amount, durationInSeconds);

// Unlock tokens (when lock period expires)
myToken.unlockTokens(address);
```

## Governance System

### Creating Proposals
Requirements:
- Minimum 100,000 tokens to create proposal
- 1-day voting delay
- 3-day voting period

```solidity
// Create new proposal
myToken.propose(
    targetAddress,
    "Proposal description",
    callData
);
```

### Voting
```solidity
// Cast vote on proposal
myToken.castVote(proposalId, support);
```

### Execution
```solidity
// Execute successful proposal
myToken.executeProposal(proposalId);
```

## Emergency Controls

### Emergency Mode
Allows freezing all transfers except by emergency admins

```solidity
// Add emergency admin
myToken.setEmergencyAdmin(address, true);

// Enable emergency mode
myToken.enableEmergencyMode();

// Disable emergency mode (owner only)
myToken.disableEmergencyMode();
```

### Asset Recovery
During emergency mode:
```solidity
// Recover stuck ERC20 tokens
myToken.recoverERC20(tokenAddress, recipient, amount);

// Recover stuck ETH
myToken.recoverETH(recipient);
```

## Best Practices

1. **Launch Sequence**
   - Enable anti-bot protection
   - Set appropriate transfer limits
   - Whitelist legitimate addresses
   - Configure fees

2. **Ongoing Management**
   - Monitor fee collections
   - Execute buybacks strategically
   - Adjust parameters based on market conditions
   - Maintain emergency admin list

3. **Security Considerations**
   - Test all features on testnet first
   - Keep owner wallet secure
   - Document all parameter changes
   - Monitor for unusual activity

## Important Notes

1. **Fee Caps**
   - Individual fees capped at 5%
   - Combined fees should be reasonable to maintain trading volume

2. **Emergency Controls**
   - 7-day cooldown between emergency actions
   - Only owner can disable emergency mode
   - Emergency admins can't recover base token

3. **Governance**
   - Proposals can't execute arbitrary code
   - Voting power based on current token holdings
   - Execution only after successful vote 