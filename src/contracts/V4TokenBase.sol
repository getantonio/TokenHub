// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./interfaces/IV4TokenBase.sol";
import "./interfaces/IV4Module.sol";

/**
 * @title V4TokenBase
 * @dev Base implementation for V4 tokens with modular architecture
 */
contract V4TokenBase is 
    Initializable, 
    ERC20Upgradeable, 
    PausableUpgradeable, 
    OwnableUpgradeable,
    IV4TokenBase
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // Version info
    string public constant VERSION = "4.0.0";
    
    // Module storage
    EnumerableSetUpgradeable.AddressSet private _modules;
    mapping(bytes32 => address) private _moduleByType;
    
    // Events
    event ModuleAdded(address indexed moduleAddress, bytes32 indexed moduleType);
    event ModuleRemoved(address indexed moduleAddress, bytes32 indexed moduleType);
    event ModuleExecution(address indexed moduleAddress, address indexed target, bool success);
    
    // Errors
    error InvalidModule();
    error ModuleExists();
    error ModuleDoesNotExist();
    error ModuleExecutionFailed();
    error CoreModuleRequired();
    error PermissionDenied();
    
    /**
     * @dev Modifier to check if caller is an active module
     */
    modifier onlyModule() {
        if (!_modules.contains(msg.sender)) {
            revert PermissionDenied();
        }
        _;
    }
    
    /**
     * @dev Constructor that disables initialization on the implementation contract
     */
    constructor() {
        _disableInitializers();
    }
    
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
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Pausable_init();
        __Ownable_init(owner_);
        
        if (initialSupply > 0) {
            _mint(owner_, initialSupply);
        }
    }
    
    /**
     * @dev Add a module to the token
     * @param moduleAddress Address of the module to add
     * @param data Initialization data for the module
     * @return success Whether the module was successfully added
     */
    function addModule(address moduleAddress, bytes calldata data) external override onlyOwner returns (bool success) {
        // Validate the module
        if (moduleAddress == address(0)) {
            revert InvalidModule();
        }
        
        if (_modules.contains(moduleAddress)) {
            revert ModuleExists();
        }
        
        // Try to initialize the module
        try IV4Module(moduleAddress).initialize(address(this), data) {
            // Get the module type
            bytes32 moduleType = IV4Module(moduleAddress).getModuleType();
            
            // Add the module to our tracking
            _modules.add(moduleAddress);
            
            // Register the module type if not already registered
            if (_moduleByType[moduleType] == address(0)) {
                _moduleByType[moduleType] = moduleAddress;
            }
            
            emit ModuleAdded(moduleAddress, moduleType);
            return true;
        } catch {
            revert InvalidModule();
        }
    }
    
    /**
     * @dev Remove a module from the token
     * @param moduleAddress Address of the module to remove
     * @return success Whether the module was successfully removed
     */
    function removeModule(address moduleAddress) external override onlyOwner returns (bool success) {
        if (!_modules.contains(moduleAddress)) {
            revert ModuleDoesNotExist();
        }
        
        // Get the module type before removing
        bytes32 moduleType = IV4Module(moduleAddress).getModuleType();
        
        // If this is a core module type, don't allow removal
        if (moduleType == keccak256("SECURITY_MODULE")) {
            revert CoreModuleRequired();
        }
        
        // Remove the module
        _modules.remove(moduleAddress);
        
        // If this was the registered module for a type, clear that registration
        if (_moduleByType[moduleType] == moduleAddress) {
            delete _moduleByType[moduleType];
        }
        
        emit ModuleRemoved(moduleAddress, moduleType);
        return true;
    }
    
    /**
     * @dev Check if a module is active
     * @param moduleAddress Address of the module to check
     * @return isActive Whether the module is active
     */
    function isModuleActive(address moduleAddress) external view override returns (bool isActive) {
        return _modules.contains(moduleAddress);
    }
    
    /**
     * @dev Get all active modules
     * @return modules Array of active module addresses
     */
    function getModules() external view override returns (address[] memory modules) {
        uint256 length = _modules.length();
        modules = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            modules[i] = _modules.at(i);
        }
        
        return modules;
    }
    
    /**
     * @dev Find a module by its type
     * @param moduleType Type of module to find
     * @return moduleAddress Address of the module, or address(0) if not found
     */
    function getModuleByType(bytes32 moduleType) external view returns (address moduleAddress) {
        return _moduleByType[moduleType];
    }
    
    /**
     * @dev Execute a function call from a module
     * @param target Target address for the call
     * @param data Call data
     * @return success Whether the call was successful
     * @return returnData Data returned by the call
     */
    function executeFromModule(address target, bytes calldata data) external override onlyModule returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(data);
        
        emit ModuleExecution(msg.sender, target, success);
        
        if (!success) {
            revert ModuleExecutionFailed();
        }
        
        return (success, returnData);
    }
    
    /**
     * @dev Pause the token
     */
    function pause() external override onlyModule {
        _pause();
    }
    
    /**
     * @dev Unpause the token
     */
    function unpause() external override onlyModule {
        _unpause();
    }
    
    /**
     * @dev Override for token transfer to respect pause state
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        require(!paused(), "V4TokenBase: token transfer while paused");
    }
} 