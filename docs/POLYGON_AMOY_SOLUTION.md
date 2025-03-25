# Polygon Amoy Token Factory Solution

## Summary of Issues

Our investigation into token creation issues on Polygon Amoy revealed multiple problems with the existing factory contract:

1. **Existing V1 Factory Issues**:
   - The factory at `0x07660e3b490E74a286927C7eF7219192003cFee2` has bytecode but is non-functional
   - Most view functions (like `implementationContract()` and `getTokensByUser()`) revert with "execution reverted"
   - The `owner()` function returns `0x0000000000000000000000000000000000000000`, suggesting an initialization problem
   - Transactions to the factory always have empty data (`"data": ""`) despite proper calldata generation

2. **Transaction Data Stripping**:
   - We identified a critical issue where transaction calldata is stripped when sent to the network
   - In the UI logs, we can see properly encoded calldata (length 650), but the transaction receipt shows empty data
   - This issue appears to be network-specific to Polygon Amoy and possibly related to MetaMask integration

3. **MetaMask-Specific Issues**:
   - Internal JSON-RPC errors from MetaMask suggest compatibility issues with this test network
   - The error pattern is consistent across different methods of transaction construction

## Our Solution

We created a custom solution specifically optimized for Polygon Amoy:

1. **Simplified Token Factory**:
   - Deployed a new lightweight factory at `0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36`
   - Eliminated complex features that might cause compatibility issues
   - Used a direct token creation approach using `CustomTinyToken`
   - Kept gas usage to a minimum

2. **Successful Testing**:
   - Created a test token "TestToken" (TEST) successfully via our factory
   - Confirmed the token shows up properly in `getTokensByUser()`
   - Verified all factory functions work as expected

3. **UI Integration**:
   - Created a specialized AmoyTokenForm component for Polygon Amoy
   - Implemented comprehensive error handling for network-specific issues
   - Added a token listing feature to show all tokens created by the user

## Implementation Details

### Contract Architecture

We created two simplified contracts:

1. **CustomTinyToken**:
   - Minimal ERC20 implementation
   - Custom constructor parameters for name, symbol, and initial supply
   - Optimized for gas efficiency

2. **AmoyTokenFactory**:
   - Deploys CustomTinyToken contracts with user-specified parameters
   - Tracks tokens created by users
   - Simple fee mechanism
   - Owner controls for fee management

### Deployment Process

1. We deployed the factory via a Hardhat script with:
   - Token verification
   - Ownership assigned to the deployer
   - Low deployment fee (0.0001 MATIC)

2. We tested token creation directly from the script to confirm:
   - Successful token deployment
   - Proper event emission
   - Token tracking in the factory

### Integration with Frontend

We created a specialized page (`/amoy`) with:
- Network detection to ensure users are on Polygon Amoy
- Form validation to prevent invalid token parameters
- Error handling specific to Polygon Amoy issues
- Token listing functionality to see all created tokens

## How to Use

### Environment Setup

Update your environment variables:
```
NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1=0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36
```

### Contract Addresses

- **Factory Contract**: `0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36`
- **Example Token**: `0x139f15923ebc9A7346D1E117d1C8844A6d319546`

### UI Navigation

Direct users to the `/amoy` page for the specialized Polygon Amoy token creation experience.

## Recommendations for Future Development

1. **Network-Specific Components**:
   - Create dedicated components for each testnet
   - Handle network-specific quirks at the component level

2. **Transaction Monitoring**:
   - Implement more robust transaction monitoring for Polygon Amoy
   - Add fallback methods when data stripping is detected

3. **Direct Deployment Option**:
   - Maintain the direct token deployment option alongside factory deployment
   - Let users choose based on their needs and network conditions

## Conclusion

The Polygon Amoy network presents unique challenges for smart contract interaction, particularly with complex factory patterns. Our solution provides a reliable, network-specific approach that bypasses these issues and ensures successful token creation. 