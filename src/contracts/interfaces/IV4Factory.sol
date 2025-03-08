// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4Factory
 * @dev Interface for the V4 Token Factory
 */
interface IV4Factory {
    /**
     * @dev Creates a new token with basic configuration
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Address that will receive the initial supply and become the owner
     * @return tokenAddress Address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) external returns (address tokenAddress);
    
    /**
     * @dev Creates a new token with an optional security module
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Address that will receive the initial supply and become the owner
     * @param securityEnabled Whether to enable the security module
     * @param additionalSigners Additional signers for the security module (if enabled)
     * @param threshold Signature threshold for the security module (if enabled)
     * @return tokenAddress Address of the newly created token
     */
    function createTokenWithSecurity(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool securityEnabled,
        address[] memory additionalSigners,
        uint256 threshold
    ) external returns (address tokenAddress);
    
    /**
     * @dev Get the implementation address for the token
     * @return implementation Address of the token implementation
     */
    function getTokenImplementation() external view returns (address implementation);
    
    /**
     * @dev Get the implementation address for the security module
     * @return implementation Address of the security module implementation
     */
    function getSecurityModuleImplementation() external view returns (address implementation);
    
    /**
     * @dev Get all tokens created by this factory
     * @return tokens Array of token addresses
     */
    function getAllTokens() external view returns (address[] memory tokens);
    
    /**
     * @dev Upgrades the token implementation
     * @param newImplementation Address of the new implementation
     * @return success Whether the upgrade was successful
     */
    function upgradeTokenImplementation(address newImplementation) external returns (bool success);
    
    /**
     * @dev Upgrades the security module implementation
     * @param newImplementation Address of the new implementation
     * @return success Whether the upgrade was successful
     */
    function upgradeSecurityModuleImplementation(address newImplementation) external returns (bool success);
} 