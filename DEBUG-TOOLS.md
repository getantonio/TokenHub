# TokenFactory Debugging Tools

This folder contains debugging tools to help troubleshoot issues with pool creation in the TokenFactory DeFi application.

## Prerequisites

These tools require Node.js and the following packages:
```
npm install viem
```

## Tools Available

### 1. Transaction Debugger (`debug-transaction.js`)

This tool analyzes a transaction to determine if a pool was successfully created and helps identify issues.

**Usage:**
```
node debug-transaction.js <transaction-hash>
```

**Example:**
```
node debug-transaction.js 0xbb0289def6efbb853b2e384a0ab87bda6efa145ebdaa01559a161a761a1b37b8
```

This will:
- Fetch the transaction details
- Check the transaction receipt status
- Look for PoolCreated events
- Parse the input data to find the asset address
- Check if a pool exists for that asset

### 2. Pool Checker (`check-pool.js`)

This tool checks if a pool exists for a specific asset in a factory contract.

**Usage:**
```
node check-pool.js <factory-address> <asset-address>
```

**Example:**
```
node check-pool.js 0x1234567890abcdef1234567890abcdef12345678 0xfea6FB7Cfd98cdDb0B79E20f216f524e355B2056
```

This will:
- Verify the factory contract exists
- Check if the asset contract exists
- Look up if a pool exists for the asset
- List all pools registered in the factory

## Common Issues and Solutions

1. **Transaction Succeeds but No Pool Created**
   - Check if the transaction emitted a PoolCreated event
   - Verify the asset address is correct
   - Ensure the factory contract is working correctly

2. **Pool Creation Fails**
   - Check if the transaction was reverted
   - Ensure you have enough ETH for the pool creation fee
   - Verify the asset is a valid ERC20 token

3. **Pool Already Exists**
   - Use the check-pool.js tool to verify if a pool already exists for your asset
   - The UI should prevent creating duplicate pools, but you can check manually

4. **Event Detection Issues**
   - Sometimes the UI might not detect a successful pool creation
   - Use these tools to verify if the pool was actually created
   - Check if the pool appears in the factory registry

## Adding More Debug Logs

To add more debug logs to the React application:
1. Edit the CreatePoolForm.tsx file
2. Add console.log statements with the [DEBUG] prefix
3. Check browser console for detailed logs during pool creation

## Support

If you encounter issues that these tools don't help resolve, please file a GitHub issue with:
- Transaction hash
- Asset address
- Factory address
- Error messages and debug logs 