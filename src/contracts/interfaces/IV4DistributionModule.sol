// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4DistributionModule
 * @dev Interface for the token distribution module
 */
interface IV4DistributionModule {
    /**
     * @dev Initialize the distribution module
     * @param tokenAddress Address of the token this module is attached to
     * @param owner Address of the initial owner
     */
    function initialize(address tokenAddress, address owner) external;
    
    /**
     * @dev Set a distribution preset
     * @param presetId Identifier for the preset
     * @param recipients Array of recipient addresses
     * @param percentages Array of percentages (in basis points, 100 = 1%)
     * @return success Whether the preset was successfully set
     */
    function setDistributionPreset(
        bytes32 presetId,
        address[] calldata recipients,
        uint256[] calldata percentages
    ) external returns (bool success);
    
    /**
     * @dev Execute a distribution using a preset
     * @param presetId Identifier for the preset to use
     * @param totalAmount Total amount to distribute
     * @return success Whether the distribution was successful
     */
    function distributeWithPreset(
        bytes32 presetId,
        uint256 totalAmount
    ) external returns (bool success);
    
    /**
     * @dev Add a recipient to a distribution preset
     * @param presetId Identifier for the preset
     * @param recipient Address of the recipient to add
     * @param percentage Percentage for the recipient (in basis points)
     * @return success Whether the recipient was successfully added
     */
    function addRecipient(
        bytes32 presetId,
        address recipient,
        uint256 percentage
    ) external returns (bool success);
    
    /**
     * @dev Remove a recipient from a distribution preset
     * @param presetId Identifier for the preset
     * @param recipient Address of the recipient to remove
     * @return success Whether the recipient was successfully removed
     */
    function removeRecipient(
        bytes32 presetId,
        address recipient
    ) external returns (bool success);
    
    /**
     * @dev Update a recipient's percentage in a distribution preset
     * @param presetId Identifier for the preset
     * @param recipient Address of the recipient to update
     * @param percentage New percentage for the recipient (in basis points)
     * @return success Whether the percentage was successfully updated
     */
    function updateRecipientPercentage(
        bytes32 presetId,
        address recipient,
        uint256 percentage
    ) external returns (bool success);
    
    /**
     * @dev Get all recipients in a distribution preset
     * @param presetId Identifier for the preset
     * @return recipients Array of recipient addresses
     * @return percentages Array of percentages (in basis points)
     */
    function getDistributionPreset(bytes32 presetId) external view returns (
        address[] memory recipients,
        uint256[] memory percentages
    );
    
    /**
     * @dev Get all distribution presets
     * @return presetIds Array of preset identifiers
     */
    function getAllPresets() external view returns (bytes32[] memory presetIds);
    
    /**
     * @dev Create a custom distribution on the fly
     * @param recipients Array of recipient addresses
     * @param amounts Array of token amounts
     * @return success Whether the distribution was successful
     */
    function distributeCustom(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (bool success);
    
    /**
     * @dev Check if a preset exists
     * @param presetId Identifier for the preset
     * @return exists Whether the preset exists
     */
    function presetExists(bytes32 presetId) external view returns (bool exists);
} 