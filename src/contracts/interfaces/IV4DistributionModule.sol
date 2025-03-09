// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4DistributionModule
 * @dev Interface for the distribution module with allocation capabilities
 */
interface IV4DistributionModule {
    /**
     * @dev Struct for each allocation entry
     */
    struct Allocation {
        address wallet;
        uint256 amount;
        string label;
        bool locked;
        uint256 unlockTime;
    }
    
    /**
     * @dev Initialize the distribution module
     * @param tokenAddress Address of the token this module is attached to
     * @param owner Address of the initial owner
     */
    function initialize(address tokenAddress, address owner) external;
    
    /**
     * @dev Add a new allocation
     * @param wallet Recipient wallet address
     * @param amount Amount of tokens to allocate
     * @param label Optional label for this allocation (e.g. "Team", "Marketing")
     * @param locked Whether the allocation should be time-locked
     * @param unlockTime Timestamp when tokens become unlocked (0 if not locked)
     * @return success Whether the allocation was successfully added
     */
    function addAllocation(
        address wallet, 
        uint256 amount, 
        string calldata label,
        bool locked,
        uint256 unlockTime
    ) external returns (bool success);
    
    /**
     * @dev Add multiple allocations at once
     * @param wallets Array of recipient wallet addresses
     * @param amounts Array of token amounts
     * @param labels Array of labels
     * @param lockStatus Array of lock statuses
     * @param unlockTimes Array of unlock times
     * @return success Whether all allocations were successfully added
     */
    function addMultipleAllocations(
        address[] calldata wallets,
        uint256[] calldata amounts,
        string[] calldata labels,
        bool[] calldata lockStatus,
        uint256[] calldata unlockTimes
    ) external returns (bool success);
    
    /**
     * @dev Apply a preset distribution
     * @param presetId Identifier for the distribution preset
     * @param totalSupply Total supply to distribute
     * @return success Whether the preset was successfully applied
     */
    function applyPreset(
        uint256 presetId,
        uint256 totalSupply
    ) external returns (bool success);
    
    /**
     * @dev Remove an allocation
     * @param wallet Recipient wallet address to remove
     * @return success Whether the allocation was successfully removed
     */
    function removeAllocation(address wallet) external returns (bool success);
    
    /**
     * @dev Modify an existing allocation
     * @param wallet Recipient wallet address
     * @param amount New amount of tokens
     * @param label New label
     * @param locked New lock status
     * @param unlockTime New unlock time
     * @return success Whether the allocation was successfully modified
     */
    function modifyAllocation(
        address wallet,
        uint256 amount,
        string calldata label,
        bool locked,
        uint256 unlockTime
    ) external returns (bool success);
    
    /**
     * @dev Get all allocations
     * @return allocations Array of allocation details
     */
    function getAllAllocations() external view returns (Allocation[] memory allocations);
    
    /**
     * @dev Get allocation for a specific wallet
     * @param wallet Recipient wallet address
     * @return allocation The allocation details
     */
    function getAllocation(address wallet) external view returns (Allocation memory allocation);
    
    /**
     * @dev Get available presets
     * @return presetIds Array of preset IDs
     * @return presetNames Array of preset names
     */
    function getAvailablePresets() external view returns (uint256[] memory presetIds, string[] memory presetNames);
    
    /**
     * @dev Get preset details
     * @param presetId Identifier for the preset
     * @return walletRatios Array of ratios for different wallet types
     * @return labels Array of labels for the wallet types
     */
    function getPresetDetails(uint256 presetId) external view returns (uint256[] memory walletRatios, string[] memory labels);
    
    /**
     * @dev Execute the distribution
     * @return success Whether the distribution was successfully executed
     */
    function executeDistribution() external returns (bool success);
    
    /**
     * @dev Unlock tokens for a wallet if the unlock time has passed
     * @param wallet Address of the wallet to unlock tokens for
     * @return success Whether the tokens were successfully unlocked
     */
    function unlockTokens(address wallet) external returns (bool success);
} 