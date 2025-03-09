# V4 Token System Guide

## Overview

The V4 Token System is a modular, upgradeable token platform that allows for flexible token creation with advanced features. The system is built on a modular architecture where different components can be added or removed to customize token functionality.

## Core Components

### 1. V4TokenBase

The base ERC20 token implementation with the following features:
- Standard ERC20 functionality (transfer, balanceOf, etc.)
- Pausable operations for emergency situations
- Module system for extending functionality
- Upgradeable design using the Beacon pattern

### 2. V4SecurityModule

A security module that provides:
- Multi-signature capabilities for important operations
- Configurable signature thresholds
- Emergency pause/unpause functionality
- Secure ownership transfer process

### 3. V4DistributionModule

A distribution module that handles token allocation:
- Preset distribution patterns
- Custom allocation to multiple wallets
- Time-locked allocations
- Vesting schedules

### 4. V4Factory

The factory contract that creates new tokens with the desired modules:
- Creates token proxies pointing to the latest implementation
- Manages implementation upgrades
- Tracks all created tokens

## Token Creation Options

When creating a new token through the V4Factory, you have several options that affect how your token will function:

### Basic Token Information

- **Name**: The full name of your token (e.g., "My Token")
- **Symbol**: The trading symbol for your token (e.g., "MTK")
- **Initial Supply**: The total number of tokens to create initially

### Security Options

The Security Module is always included and provides:

- **Multi-signature Control**: Require multiple signatures for critical operations
- **Signers**: Addresses that can participate in multi-sig operations
- **Threshold**: Number of signatures required to approve operations
- **Emergency Controls**: Ability to pause the token in emergency situations

### Distribution Options

The Distribution Module is optional and provides:

- **Token Distribution**: Allocate tokens to multiple wallets
- **Preset Distributions**: Pre-configured allocation patterns:
  - **Standard ICO**: 50% Public Sale, 20% Team, 15% Reserve, 10% Marketing, 5% Advisors
  - **Community Focused**: 40% Community Rewards, 20% Public Sale, 15% Team, 10% Development, 10% Marketing, 5% Advisors
  - **DeFi Project**: 30% Liquidity Provision, 25% Community Incentives, 15% Team, 10% Public Sale, 10% Development, 5% Marketing, 5% Partnerships
  - **Equal Distribution**: 25% Public, 25% Team, 25% Development, 25% Marketing
- **Custom Allocations**: Create your own distribution pattern
- **Time-locked Allocations**: Lock tokens until a specific date
- **Allocation Labels**: Label different allocations (e.g., "Team", "Marketing")

## How Distribution Works

The distribution module allows you to:

1. **Apply a Preset**: Choose a predefined distribution pattern
2. **Customize Allocations**: Add, modify, or remove allocations
3. **Execute Distribution**: Mint tokens to all allocated wallets
4. **Manage Locked Tokens**: Release time-locked tokens when they vest

### Distribution Process

1. **Setup Phase**:
   - Choose whether to include the distribution module
   - Apply a preset or create custom allocations
   - Configure time locks if needed

2. **Execution Phase**:
   - Execute the distribution to mint tokens to recipients
   - Locked tokens are held by the distribution module until unlock time

3. **Post-Distribution**:
   - Unlock time-locked tokens when vesting periods end
   - Monitor token distribution

## Effects on Token Behavior

Different options affect your token in the following ways:

### Including the Distribution Module

- **With Distribution Module**: Initial supply is not minted to the owner; instead, tokens are allocated according to the distribution configuration and minted when distribution is executed.
- **Without Distribution Module**: All initial supply is minted directly to the owner address.

### Security Configuration

- **Higher Signature Threshold**: More secure but potentially slower decision-making
- **Lower Signature Threshold**: Faster operations but potentially less secure
- **Multiple Signers**: Distributes control among multiple parties

### Time-locked Allocations

- **Locked Tokens**: Recipients cannot access tokens until the unlock time
- **Unlocked Tokens**: Immediately available to recipients

## Best Practices

1. **Security First**: Always set up multiple signers for important tokens
2. **Plan Distribution**: Carefully plan token distribution before executing
3. **Test Thoroughly**: Test all operations on a testnet before mainnet deployment
4. **Document Decisions**: Keep records of all configuration decisions
5. **Educate Stakeholders**: Ensure all token holders understand the token's features

## Technical Details

### Module System

The V4 token uses a modular architecture where:
- Each module has a specific responsibility
- Modules can be added or removed (except core modules)
- Modules communicate with the token through a standardized interface
- The token delegates certain operations to appropriate modules

### Upgradeability

The system uses the Beacon Proxy pattern for upgradeability:
- Implementation contracts can be upgraded
- All proxies automatically point to the latest implementation
- Upgrades are controlled by the factory owner

### Multi-signature Process

The security module implements multi-sig as follows:
1. A signer proposes an operation
2. Other signers confirm the proposal
3. When threshold is reached, the operation executes
4. If threshold is 1, operations execute immediately

## Common Use Cases

1. **ICO Token**: Use the Standard ICO preset with time-locked team allocations
2. **Community Token**: Use the Community Focused preset with low thresholds
3. **Governance Token**: Use Equal Distribution with high security thresholds
4. **DeFi Token**: Use the DeFi Project preset with liquidity allocations

## Troubleshooting

### Common Issues

1. **Transaction Reverted**: Check if the token is paused or if you have sufficient permissions
2. **Cannot Modify Allocation**: Ensure distribution has not been executed yet
3. **Cannot Unlock Tokens**: Verify the unlock time has passed
4. **Module Function Not Working**: Ensure the module is properly registered

### Support

For additional support, please contact the development team or refer to the technical documentation. 