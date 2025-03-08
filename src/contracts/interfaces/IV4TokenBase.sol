// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4TokenBase
 * @dev Interface for the V4 token base
 */
interface IV4TokenBase {
    /**
     * @dev Add a module to the token
     * @param moduleAddress Address of the module to add
     * @param data Initialization data for the module
     * @return success Whether the module was successfully added
     */
    function addModule(address moduleAddress, bytes calldata data) external returns (bool success);
    
    /**
     * @dev Remove a module from the token
     * @param moduleAddress Address of the module to remove
     * @return success Whether the module was successfully removed
     */
    function removeModule(address moduleAddress) external returns (bool success);
    
    /**
     * @dev Check if a module is active
     * @param moduleAddress Address of the module to check
     * @return isActive Whether the module is active
     */
    function isModuleActive(address moduleAddress) external view returns (bool isActive);
    
    /**
     * @dev Get all active modules
     * @return modules Array of active module addresses
     */
    function getModules() external view returns (address[] memory modules);
    
    /**
     * @dev Execute a function call from a module
     * @param target Target address for the call
     * @param data Call data
     * @return success Whether the call was successful
     * @return returnData Data returned by the call
     */
    function executeFromModule(address target, bytes calldata data) external returns (bool success, bytes memory returnData);
    
    /**
     * @dev Pause the token
     */
    function pause() external;
    
    /**
     * @dev Unpause the token
     */
    function unpause() external;
    
    /**
     * @dev Transfer ownership of the token
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external;
} 