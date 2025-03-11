// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IV4TokenBase.sol";
import "./interfaces/IV4Module.sol";

/**
 * @title V4TokenBase
 * @dev Base implementation for V4 tokens with modular architecture
 */
contract V4TokenBase is 
    Initializable, 
    ERC20Upgradeable, 
    OwnableUpgradeable,
    PausableUpgradeable,
    IV4TokenBase
{    
    mapping(address => bool) private _modules;
    address[] private _moduleList;
    
    error ModuleExists();
    error ModuleDoesNotExist();
    error PermissionDenied();
    
    modifier onlyModule() {
        if (!_modules[msg.sender]) {
            revert PermissionDenied();
        }
        _;
    }
    
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address owner_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Ownable_init();
        __Pausable_init();
        _transferOwnership(owner_);
        
        if (initialSupply > 0) {
            _mint(owner_, initialSupply);
        }
    }
    
    function addModule(address moduleAddress, bytes calldata data) external override onlyOwner returns (bool) {
        if (_modules[moduleAddress]) {
            revert ModuleExists();
        }
        
        try IV4Module(moduleAddress).initialize(address(this), data) {
            _modules[moduleAddress] = true;
            _moduleList.push(moduleAddress);
            return true;
        } catch {
            return false;
        }
    }
    
    function removeModule(address moduleAddress) external override onlyOwner returns (bool) {
        if (!_modules[moduleAddress]) {
            revert ModuleDoesNotExist();
        }
        
        _modules[moduleAddress] = false;
        
        // Remove from list
        for (uint i = 0; i < _moduleList.length; i++) {
            if (_moduleList[i] == moduleAddress) {
                _moduleList[i] = _moduleList[_moduleList.length - 1];
                _moduleList.pop();
                break;
            }
        }
        
        return true;
    }
    
    function isModuleActive(address moduleAddress) external view override returns (bool) {
        return _modules[moduleAddress];
    }
    
    function executeFromModule(address target, bytes calldata data) external override onlyModule returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(data);
        return (success, returnData);
    }
    
    function getModules() external view override returns (address[] memory) {
        return _moduleList;
    }
    
    function pause() external override onlyModule {
        _pause();
    }
    
    function unpause() external override onlyModule {
        _unpause();
    }
    
    function transferOwnership(address newOwner) public override(OwnableUpgradeable, IV4TokenBase) onlyOwner {
        super.transferOwnership(newOwner);
    }

    function owner() public view override(OwnableUpgradeable, IV4TokenBase) returns (address) {
        return super.owner();
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "V4TokenBase: token transfer while paused");
    }
} 