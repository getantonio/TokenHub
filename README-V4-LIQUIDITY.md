# V4 Token Factory with Liquidity Module Integration

This README provides instructions for deploying the enhanced V4 Token Factory with integrated Liquidity Module that uses the same router address as the V3 factory.

## Overview

The V4 Token Factory system has been enhanced with a dedicated Liquidity Module that directly integrates with the QuickSwap router on Polygon Amoy. This solves the transaction revert issues experienced with the original V4 factory implementation.

## Key Components

1. **V4LiquidityModule**: A new module that handles DEX integration, using the same QuickSwap router address as V3 (0x7E0987E5b3a30e3f2828572Bb659A548460a3003)
2. **Updated V4Factory**: Modified to support and include the new liquidity module
3. **Deployment scripts**: New scripts to deploy the enhanced system
4. **V4FactoryWithLiquidity**: Fixed implementation that ensures proper module ordering

## Known Issues and Fixes

The original V4 factory with liquidity module (0xdb45Ac5348e4994B4EDB555EEBe16E621eF8F1D1) has an issue with the distribution module not being properly initialized. This occurs because the token ownership is transferred to the security module before other modules are added, causing "Ownable: caller is not the owner" errors during module addition.

The fixed V4FactoryWithLiquidity implementation resolves this by:
1. Creating all modules first
2. Adding all modules to the token while the token is still owned by the factory
3. Only transferring ownership to the security module after all modules are successfully added

## Deployment Instructions

### Step 1: Deploy the V4LiquidityModule Implementation

```bash
npx hardhat run scripts/deploy-v4-liquidity-module.ts --network polygonamoy
```

This will deploy the V4LiquidityModule implementation and return its address. Make a note of this address for the next step.

### Step 2: Deploy the Full System

```bash
npx hardhat run scripts/deploy-v4-polygonamoy-with-liquidity.ts --network polygonamoy
```

This script will:
1. Deploy all module implementations (including the liquidity module) if not already deployed
2. Deploy the V4Factory with all modules configured
3. Test token creation to verify the system works
4. Output environment variables to add to your .env.local file

### Step 3: Deploy the Fixed Factory (if needed)

If you're experiencing issues with the distribution module, deploy the fixed factory:

```bash
npx hardhat run scripts/deploy-v4-factory-fixed.ts --network polygonamoy
```

This deploys a V4FactoryWithLiquidity that fixes the module ordering issue.

### Step 4: Update Environment Variables

Add the new factory addresses to your `.env.local` file:

```
NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY=[factory-address]
NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED=[fixed-factory-address]
```

Where `[factory-address]` and `[fixed-factory-address]` are the addresses output by the deployment scripts.

## Verification

After deployment, verify the contracts on the blockchain explorer:

```bash
npx hardhat verify --network polygonamoy [liquidity-module-address]
npx hardhat verify --network polygonamoy [factory-address] [owner-address] [token-impl-address] [security-module-impl-address] [distribution-module-impl-address] [liquidity-module-impl-address]
```

## Usage

The system will automatically try to use the fixed V4 factory with liquidity module first, then fall back to the original V4 factory with liquidity, and finally to the regular V4 factory if neither is available.

## Architecture

The Liquidity Module implements these key functions:

- `addLiquidity`: Add token/ETH liquidity to QuickSwap
- `removeLiquidity`: Remove liquidity from QuickSwap
- `lockLiquidity`: Lock liquidity for a specified duration
- `getLPTokenBalance`: Get LP token balance for an account
- `getReserves`: Get the current reserves in the liquidity pair

The module is hardcoded to use the QuickSwap router address (0x7E0987E5b3a30e3f2828572Bb659A548460a3003) for Polygon Amoy. 