// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4SecurityModule
 * @dev Interface for the security module with multi-sig capabilities
 */
interface IV4SecurityModule {
    /**
     * @dev Initialize the security module
     * @param tokenAddress Address of the token this module is attached to
     * @param owner Address of the initial owner
     */
    function initialize(address tokenAddress, address owner) external;
    
    /**
     * @dev Propose a new owner (multi-sig process step 1)
     * @param newOwner Address of the proposed new owner
     * @return proposalId Identifier for the ownership transfer proposal
     */
    function proposeOwnershipTransfer(address newOwner) external returns (bytes32 proposalId);
    
    /**
     * @dev Confirm an ownership transfer proposal (multi-sig process step 2)
     * @param proposalId Identifier of the proposal to confirm
     * @return success Whether the ownership was successfully transferred
     */
    function confirmOwnershipTransfer(bytes32 proposalId) external returns (bool success);
    
    /**
     * @dev Add a new signer to the multi-sig configuration
     * @param signer Address to add as a signer
     * @return success Whether the signer was successfully added
     */
    function addSigner(address signer) external returns (bool success);
    
    /**
     * @dev Remove a signer from the multi-sig configuration
     * @param signer Address to remove from signers
     * @return success Whether the signer was successfully removed
     */
    function removeSigner(address signer) external returns (bool success);
    
    /**
     * @dev Set the required number of signatures for operations
     * @param threshold Number of required signatures
     * @return success Whether the threshold was successfully set
     */
    function setThreshold(uint256 threshold) external returns (bool success);
    
    /**
     * @dev Check if an address is a signer
     * @param account Address to check
     * @return isSigner Whether the address is a signer
     */
    function isSigner(address account) external view returns (bool isSigner);
    
    /**
     * @dev Get the current signature threshold
     * @return threshold The current signature threshold
     */
    function getThreshold() external view returns (uint256 threshold);
    
    /**
     * @dev Get all current signers
     * @return signers Array of current signer addresses
     */
    function getSigners() external view returns (address[] memory signers);
    
    /**
     * @dev Emergency pause for the token
     * @return success Whether the pause was successful
     */
    function emergencyPause() external returns (bool success);
    
    /**
     * @dev Unpause the token after emergency
     * @return success Whether the unpause was successful
     */
    function emergencyUnpause() external returns (bool success);
} 