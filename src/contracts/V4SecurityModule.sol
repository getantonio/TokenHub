// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./interfaces/IV4SecurityModule.sol";
import "./interfaces/IV4Module.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4SecurityModule
 * @dev Implementation of security module with multi-sig capabilities
 */
contract V4SecurityModule is 
    Initializable, 
    OwnableUpgradeable, 
    IV4SecurityModule,
    IV4Module
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // Token this module is attached to
    address private _token;
    
    // Multi-sig configuration
    EnumerableSetUpgradeable.AddressSet private _signers;
    uint256 private _threshold;
    
    // Proposal tracking
    mapping(bytes32 => address) private _ownershipProposals;
    mapping(bytes32 => mapping(address => bool)) private _confirmations;
    mapping(bytes32 => uint256) private _confirmationCounts;
    
    // Version info
    string public constant VERSION = "4.0.0";
    
    // Events
    event OwnershipTransferProposed(bytes32 indexed proposalId, address indexed proposedOwner);
    event OwnershipTransferConfirmed(bytes32 indexed proposalId, address indexed signer);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event EmergencyPaused(address trigger);
    event EmergencyUnpaused(address trigger);
    
    /**
     * @dev Modifier to check if caller is a signer
     */
    modifier onlySigner() {
        require(_signers.contains(msg.sender), "V4SecurityModule: caller is not a signer");
        _;
    }
    
    /**
     * @dev Constructor that disables initialization on the implementation contract
     */
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the security module
     * @param tokenAddress Address of the token this module is attached to
     * @param owner Address of the initial owner
     */
    function initialize(address tokenAddress, address owner) public override initializer {
        __Ownable_init(owner);
        
        require(tokenAddress != address(0), "V4SecurityModule: token address cannot be zero");
        _token = tokenAddress;
        
        // Add the owner as the first signer
        _signers.add(owner);
        _threshold = 1; // Default to 1 signature required
    }
    
    /**
     * @dev Initialize the module
     * @param tokenAddress Address of the token this module is attached to
     * @param data Additional initialization data (owner address)
     */
    function initialize(address tokenAddress, bytes calldata data) external override initializer {
        require(data.length == 32, "V4SecurityModule: invalid initialization data");
        address owner = address(uint160(uint256(bytes32(data))));
        initialize(tokenAddress, owner);
    }
    
    /**
     * @dev Get the type of this module
     * @return moduleType Type identifier for this module
     */
    function getModuleType() external pure override returns (bytes32 moduleType) {
        return keccak256("SECURITY_MODULE");
    }
    
    /**
     * @dev Check if this module has a specific function
     * @param functionSig Function signature to check for
     * @return hasFunction Whether the module implements the function
     */
    function supportsFunction(bytes4 functionSig) external pure override returns (bool hasFunction) {
        return 
            functionSig == IV4SecurityModule.proposeOwnershipTransfer.selector ||
            functionSig == IV4SecurityModule.confirmOwnershipTransfer.selector ||
            functionSig == IV4SecurityModule.addSigner.selector ||
            functionSig == IV4SecurityModule.removeSigner.selector ||
            functionSig == IV4SecurityModule.setThreshold.selector ||
            functionSig == IV4SecurityModule.isSigner.selector ||
            functionSig == IV4SecurityModule.getThreshold.selector ||
            functionSig == IV4SecurityModule.getSigners.selector ||
            functionSig == IV4SecurityModule.emergencyPause.selector ||
            functionSig == IV4SecurityModule.emergencyUnpause.selector;
    }
    
    /**
     * @dev Get the token this module is attached to
     * @return tokenAddress Address of the token
     */
    function getToken() external view override returns (address tokenAddress) {
        return _token;
    }
    
    /**
     * @dev Propose a new owner (multi-sig process step 1)
     * @param newOwner Address of the proposed new owner
     * @return proposalId Identifier for the ownership transfer proposal
     */
    function proposeOwnershipTransfer(address newOwner) external override onlySigner returns (bytes32 proposalId) {
        require(newOwner != address(0), "V4SecurityModule: new owner cannot be zero address");
        
        // Generate proposal ID
        proposalId = keccak256(abi.encodePacked(newOwner, block.timestamp, msg.sender));
        
        // Store the proposal
        _ownershipProposals[proposalId] = newOwner;
        
        // Auto-confirm from proposer
        _confirmations[proposalId][msg.sender] = true;
        _confirmationCounts[proposalId] = 1;
        
        emit OwnershipTransferProposed(proposalId, newOwner);
        emit OwnershipTransferConfirmed(proposalId, msg.sender);
        
        // If only one signature needed, execute immediately
        if (_threshold == 1) {
            _executeOwnershipTransfer(proposalId);
        }
        
        return proposalId;
    }
    
    /**
     * @dev Confirm an ownership transfer proposal (multi-sig process step 2)
     * @param proposalId Identifier of the proposal to confirm
     * @return success Whether the ownership was successfully transferred
     */
    function confirmOwnershipTransfer(bytes32 proposalId) external override onlySigner returns (bool success) {
        address newOwner = _ownershipProposals[proposalId];
        require(newOwner != address(0), "V4SecurityModule: proposal does not exist");
        require(!_confirmations[proposalId][msg.sender], "V4SecurityModule: already confirmed");
        
        // Add confirmation
        _confirmations[proposalId][msg.sender] = true;
        _confirmationCounts[proposalId] += 1;
        
        emit OwnershipTransferConfirmed(proposalId, msg.sender);
        
        // Check if threshold is reached
        if (_confirmationCounts[proposalId] >= _threshold) {
            _executeOwnershipTransfer(proposalId);
        }
        
        return true;
    }
    
    /**
     * @dev Execute an ownership transfer
     * @param proposalId Identifier of the proposal to execute
     */
    function _executeOwnershipTransfer(bytes32 proposalId) private {
        address newOwner = _ownershipProposals[proposalId];
        address currentOwner = owner();
        
        // Transfer ownership of this module and the token
        _transferOwnership(newOwner);
        
        // Transfer ownership of the token using module execution rights
        // This is a complex call because we need to call the token from this module
        bytes memory data = abi.encodeWithSignature("transferOwnership(address)", newOwner);
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        // Clean up proposal
        delete _ownershipProposals[proposalId];
        
        emit OwnershipTransferred(currentOwner, newOwner);
    }
    
    /**
     * @dev Add a new signer to the multi-sig configuration
     * @param signer Address to add as a signer
     * @return success Whether the signer was successfully added
     */
    function addSigner(address signer) external override onlyOwner returns (bool success) {
        require(signer != address(0), "V4SecurityModule: signer cannot be zero address");
        require(!_signers.contains(signer), "V4SecurityModule: signer already exists");
        
        _signers.add(signer);
        
        emit SignerAdded(signer);
        return true;
    }
    
    /**
     * @dev Remove a signer from the multi-sig configuration
     * @param signer Address to remove from signers
     * @return success Whether the signer was successfully removed
     */
    function removeSigner(address signer) external override onlyOwner returns (bool success) {
        require(_signers.contains(signer), "V4SecurityModule: signer does not exist");
        require(_signers.length() > _threshold, "V4SecurityModule: would break threshold");
        require(signer != owner(), "V4SecurityModule: cannot remove owner");
        
        _signers.remove(signer);
        
        emit SignerRemoved(signer);
        return true;
    }
    
    /**
     * @dev Set the required number of signatures for operations
     * @param threshold Number of required signatures
     * @return success Whether the threshold was successfully set
     */
    function setThreshold(uint256 threshold) external override onlyOwner returns (bool success) {
        require(threshold > 0, "V4SecurityModule: threshold cannot be zero");
        require(threshold <= _signers.length(), "V4SecurityModule: threshold too high");
        
        uint256 oldThreshold = _threshold;
        _threshold = threshold;
        
        emit ThresholdChanged(oldThreshold, threshold);
        return true;
    }
    
    /**
     * @dev Check if an address is a signer
     * @param account Address to check
     * @return isSigner Whether the address is a signer
     */
    function isSigner(address account) external view override returns (bool isSigner) {
        return _signers.contains(account);
    }
    
    /**
     * @dev Get the current signature threshold
     * @return threshold The current signature threshold
     */
    function getThreshold() external view override returns (uint256 threshold) {
        return _threshold;
    }
    
    /**
     * @dev Get all current signers
     * @return signers Array of current signer addresses
     */
    function getSigners() external view override returns (address[] memory signers) {
        uint256 length = _signers.length();
        signers = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            signers[i] = _signers.at(i);
        }
        
        return signers;
    }
    
    /**
     * @dev Emergency pause for the token
     * @return success Whether the pause was successful
     */
    function emergencyPause() external override onlySigner returns (bool success) {
        // Call pause on the token using module execution rights
        bytes memory data = abi.encodeWithSignature("pause()");
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        emit EmergencyPaused(msg.sender);
        return true;
    }
    
    /**
     * @dev Unpause the token after emergency
     * @return success Whether the unpause was successful
     */
    function emergencyUnpause() external override onlySigner returns (bool success) {
        // Call unpause on the token using module execution rights
        bytes memory data = abi.encodeWithSignature("unpause()");
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        emit EmergencyUnpaused(msg.sender);
        return true;
    }
} 