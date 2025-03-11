// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4TokenBase
 * @dev Interface for the V4 token base
 */
interface IV4TokenBase {
    /**
     * @dev Initialize the token with basic parameters
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner_ Address that will receive the initial supply and become the owner
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address owner_
    ) external;
    
    /**
     * @dev Add a module to the token
     * @param moduleAddress Address of the module to add
     * @param data Initialization data for the module
     * @return success Whether the module was successfully added
     */
    function addModule(address moduleAddress, bytes calldata data) external returns (bool);
    
    /**
     * @dev Remove a module from the token
     * @param moduleAddress Address of the module to remove
     * @return success Whether the module was successfully removed
     */
    function removeModule(address moduleAddress) external returns (bool);
    
    /**
     * @dev Check if a module is active
     * @param moduleAddress Address of the module to check
     * @return isActive Whether the module is active
     */
    function isModuleActive(address moduleAddress) external view returns (bool);
    
    /**
     * @dev Get all active modules
     * @return modules Array of active module addresses
     */
    function getModules() external view returns (address[] memory);
    
    /**
     * @dev Execute a function call from a module
     * @param target Target address for the call
     * @param data Call data
     * @return success Whether the call was successful
     * @return returnData Data returned by the call
     */
    function executeFromModule(address target, bytes calldata data) external returns (bool, bytes memory);
    
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

    /**
     * @dev Get the current owner of the token
     * @return The address of the current owner
     */
    function owner() external view returns (address);
} 