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
    
    address private _token;
    EnumerableSetUpgradeable.AddressSet private _signers;
    uint256 private _threshold;
    
    function initialize(address tokenAddress, bytes calldata data) external override initializer {
        require(data.length == 32, "V4SecurityModule: invalid initialization data");
        address owner = address(uint160(uint256(bytes32(data))));
        __Ownable_init();
        _transferOwnership(owner);
        
        require(tokenAddress != address(0), "V4SecurityModule: token address cannot be zero");
        _token = tokenAddress;
        
        _signers.add(owner);
        _threshold = 1;
    }
    
    function getModuleType() external pure override returns (bytes32) {
        return keccak256("SECURITY_MODULE");
    }
    
    function supportsFunction(bytes4 functionSig) external pure override returns (bool) {
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
    
    function getToken() external view override returns (address) {
        return _token;
    }
    
    function proposeOwnershipTransfer(address newOwner) external override returns (bytes32) {
        require(msg.sender == owner(), "V4SecurityModule: caller is not owner");
        require(newOwner != address(0), "V4SecurityModule: new owner cannot be zero address");
        
        _transferOwnership(newOwner);
        
        bytes memory data = abi.encodeWithSignature("transferOwnership(address)", newOwner);
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        return bytes32(0);
    }
    
    function confirmOwnershipTransfer(bytes32) external pure override returns (bool) {
        return true;
    }
    
    function addSigner(address signer) external override returns (bool) {
        require(msg.sender == owner(), "V4SecurityModule: caller is not owner");
        require(!_signers.contains(signer), "V4SecurityModule: signer already exists");
        
        _signers.add(signer);
        return true;
    }
    
    function removeSigner(address signer) external override returns (bool) {
        require(msg.sender == owner(), "V4SecurityModule: caller is not owner");
        require(_signers.contains(signer), "V4SecurityModule: signer does not exist");
        require(_signers.length() > _threshold, "V4SecurityModule: would break threshold");
        require(signer != owner(), "V4SecurityModule: cannot remove owner");
        
        _signers.remove(signer);
        return true;
    }
    
    function setThreshold(uint256 threshold) external override returns (bool) {
        require(msg.sender == owner(), "V4SecurityModule: caller is not owner");
        require(threshold > 0, "V4SecurityModule: threshold cannot be zero");
        require(threshold <= _signers.length(), "V4SecurityModule: threshold too high");
        
        _threshold = threshold;
        return true;
    }
    
    function isSigner(address account) external view override returns (bool) {
        return _signers.contains(account);
    }
    
    function getThreshold() external view override returns (uint256) {
        return _threshold;
    }
    
    function getSigners() external view override returns (address[] memory) {
        uint256 length = _signers.length();
        address[] memory signers = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            signers[i] = _signers.at(i);
        }
        
        return signers;
    }
    
    function emergencyPause() external override returns (bool) {
        require(_signers.contains(msg.sender), "V4SecurityModule: caller is not signer");
        
        bytes memory data = abi.encodeWithSignature("pause()");
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        return true;
    }
    
    function emergencyUnpause() external override returns (bool) {
        require(_signers.contains(msg.sender), "V4SecurityModule: caller is not signer");
        
        bytes memory data = abi.encodeWithSignature("unpause()");
        IV4TokenBase(_token).executeFromModule(_token, data);
        
        return true;
    }
} 