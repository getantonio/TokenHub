// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4Module
 * @dev Interface for all V4 modules
 */
interface IV4Module {
    /**
     * @dev Initialize the module
     * @param tokenAddress Address of the token this module is attached to
     * @param data Additional initialization data
     */
    function initialize(address tokenAddress, bytes calldata data) external;
    
    /**
     * @dev Get the type of this module
     * @return moduleType Type identifier for this module
     */
    function getModuleType() external pure returns (bytes32);
    
    /**
     * @dev Check if this module has a specific function
     * @param functionSig Function signature to check for
     * @return hasFunction Whether the module implements the function
     */
    function supportsFunction(bytes4 functionSig) external pure returns (bool);
    
    /**
     * @dev Get the token this module is attached to
     * @return tokenAddress Address of the token
     */
    function getToken() external view returns (address);
} 