// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./V4FactoryWithLiquidityFixedV6.sol";

/**
 * @title V4FactoryWithLiquidityFixedV7
 * @dev Extended V4FactoryWithLiquidityFixedV6 that adds token tracking functions
 * to enable frontend to retrieve tokens created by a user
 */
contract V4FactoryWithLiquidityFixedV7 is V4FactoryWithLiquidityFixedV6 {
    // Track tokens created by users
    mapping(address => address[]) private userCreatedTokens;
    // All tokens created by the factory
    address[] private allTokens;
    
    /**
     * @dev Initialize the factory with implementation contracts
     * @param owner_ The owner of the factory
     * @param tokenImpl_ The token implementation address
     * @param securityModuleImpl_ The security module implementation address
     * @param distributionModuleImpl_ The distribution module implementation address
     * @param liquidityModuleImpl_ The liquidity module implementation address
     */
    constructor(
        address owner_,
        address tokenImpl_,
        address securityModuleImpl_,
        address distributionModuleImpl_,
        address liquidityModuleImpl_
    ) V4FactoryWithLiquidityFixedV6(
        owner_,
        tokenImpl_,
        securityModuleImpl_,
        distributionModuleImpl_,
        liquidityModuleImpl_
    ) {}
    
    /**
     * @dev Override _createTokenWithDistribution to track tokens created by users
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Flag to include distribution module
     * @param walletAllocations Array of wallet allocations
     * @return tokenAddress Address of the newly created token
     */
    function _createTokenWithDistribution(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution,
        WalletAllocation[] memory walletAllocations
    ) internal override returns (address tokenAddress) {
        // Call parent implementation
        tokenAddress = super._createTokenWithDistribution(name, symbol, initialSupply, owner, includeDistribution, walletAllocations);
        
        // If token creation was successful, track it
        if (tokenAddress != address(0)) {
            // Add to user's tokens
            userCreatedTokens[owner].push(tokenAddress);
            // Add to all tokens
            allTokens.push(tokenAddress);
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Get all tokens created by a specific user
     * @param user The user address to check
     * @return An array of token addresses created by the user
     */
    function getUserCreatedTokens(address user) external view returns (address[] memory) {
        return userCreatedTokens[user];
    }
    
    /**
     * @dev Alternative name for getUserCreatedTokens to maintain compatibility
     * @param user The user address to check
     * @return An array of token addresses created by the user
     */
    function getUserTokens(address user) external view returns (address[] memory) {
        return userCreatedTokens[user];
    }
    
    /**
     * @dev Get all tokens created by the factory
     * @return An array of all token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
} 