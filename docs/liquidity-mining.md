# Liquidity Mining System

This document explains how to set up and use the liquidity mining system for your DeFi lending pools.

## Overview

The liquidity mining system allows you to distribute reward tokens to users who provide liquidity to your lending pools. This incentivizes users to deposit assets into your protocol, increasing TVL (Total Value Locked) and overall usage.

The system consists of three main components:

1. **RewardToken**: An ERC20 token used to reward liquidity providers
2. **LiquidityMining**: A contract that manages staking, reward distribution, and token emissions
3. **LiquidityMiningFactory**: A factory that deploys and configures new liquidity mining programs

## How It Works

1. Users deposit assets into a lending pool and receive LP tokens
2. Users stake their LP tokens in the liquidity mining contract
3. The system distributes reward tokens to stakers based on their share of the pool and the configured reward rate
4. Users can claim their rewards at any time
5. Users can unstake their LP tokens at any time

## Deployment

### Deploy Implementation Contracts

First, deploy the implementation contracts and factory:

```bash
npx hardhat run scripts/deploy-liquidity-mining.js --network <your-network>
```

This will deploy:
- The RewardToken implementation
- The LiquidityMining implementation
- The LiquidityMiningFactory

Save the addresses for future use.

### Create a Liquidity Mining Program

To create a new liquidity mining program for a specific lending pool, run:

```bash
export FACTORY_ADDRESS=<your-factory-address>
export POOL_ADDRESS=<your-lending-pool-address>
export TOKEN_NAME="Lending Reward Token"
export TOKEN_SYMBOL="LRT"
export REWARD_RATE="0.1"  # 0.1 tokens per second
export MAX_SUPPLY="10000000"  # 10 million tokens
export INITIAL_SUPPLY="1000000"  # 1 million tokens

npx hardhat run scripts/create-mining-program.js --network <your-network>
```

This will:
1. Create a new reward token
2. Set up a new liquidity mining program
3. Configure the program with the specified parameters

## User Interactions

Users can interact with the liquidity mining program in several ways:

### Staking LP Tokens

After depositing assets into a lending pool and receiving LP tokens, users can stake them:

```solidity
// First, approve the liquidity mining contract to spend LP tokens
IERC20(lendingPool).approve(miningProgram, amount);

// Then stake the LP tokens
LiquidityMining(miningProgram).stake(lendingPool, amount);
```

### Claiming Rewards

Users can claim their accumulated rewards:

```solidity
LiquidityMining(miningProgram).claim(lendingPool);
```

### Withdrawing Staked LP Tokens

Users can withdraw their staked LP tokens:

```solidity
LiquidityMining(miningProgram).withdraw(lendingPool, amount);
```

## Protocol Management

As the protocol owner, you can:

### Update Reward Rates

Adjust the emission rate of rewards:

```solidity
LiquidityMining(miningProgram).setRewardRate(lendingPool, newRate);
```

### Add New Pools

Add new lending pools to an existing mining program:

```solidity
LiquidityMining(miningProgram).addPool(newLendingPool, rewardRate);
```

## Design Considerations

- The system uses a "rewards per share" accounting system, which efficiently tracks rewards for all users
- Rewards accrue continuously, based on block timestamps
- The reward token has a maximum supply cap to control inflation
- Each lending pool can have its own reward rate, allowing for targeted incentives

## Security Considerations

- The contracts use reentrancy guards to prevent attacks
- The reward token can only be minted by the liquidity mining contract
- There are checks to prevent double-initialization of contracts
- The factory uses the minimal proxy pattern (EIP-1167) to save gas when deploying new programs 