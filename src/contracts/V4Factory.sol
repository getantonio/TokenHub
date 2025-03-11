// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4Factory
 * @dev Factory for creating V4 tokens with modular architecture
 */
contract V4Factory is Ownable {
    // Implementation addresses
    address public tokenImplementation;
    address public securityModuleImplementation;
    
    // Beacon contracts for upgrades
    UpgradeableBeacon public tokenBeacon;
    UpgradeableBeacon public securityModuleBeacon;
    
    // Events
    event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner);
    
    // Function selectors
    bytes4 private constant TOKEN_INITIALIZE_SELECTOR = bytes4(keccak256("initialize(string,string,uint256,address)"));
    bytes4 private constant MODULE_INITIALIZE_SELECTOR = bytes4(keccak256("initialize(address,bytes)"));
    
    /**
     * @dev Initialize the factory with implementation contracts
     * @param owner_ The owner of the factory
     * @param tokenImpl_ The token implementation address
     * @param securityModuleImpl_ The security module implementation address
     */
    constructor(
        address owner_,
        address tokenImpl_,
        address securityModuleImpl_
    ) {
        _transferOwnership(owner_);
        
        tokenImplementation = tokenImpl_;
        securityModuleImplementation = securityModuleImpl_;
        
        tokenBeacon = new UpgradeableBeacon(tokenImplementation);
        securityModuleBeacon = new UpgradeableBeacon(securityModuleImplementation);
        
        tokenBeacon.transferOwnership(owner_);
        securityModuleBeacon.transferOwnership(owner_);
    }
    
    /**
     * @dev Create a new V4 token with default modules
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @return tokenAddress Address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) external returns (address tokenAddress) {
        // Create token proxy
        bytes memory tokenData = abi.encodeWithSelector(
            TOKEN_INITIALIZE_SELECTOR,
            name,
            symbol,
            initialSupply,
            owner
        );
        
        BeaconProxy tokenProxy = new BeaconProxy(
            address(tokenBeacon),
            tokenData
        );
        tokenAddress = address(tokenProxy);
        
        // Create security module
        bytes32 securityModuleInitData = bytes32(uint256(uint160(owner)));
        bytes memory securityData = abi.encodeWithSelector(
            MODULE_INITIALIZE_SELECTOR,
            tokenAddress,
            abi.encode(securityModuleInitData)
        );
        
        BeaconProxy securityModuleProxy = new BeaconProxy(
            address(securityModuleBeacon),
            securityData
        );
        address securityModuleAddress = address(securityModuleProxy);
        
        // Add security module to token
        IV4TokenBase(tokenAddress).addModule(securityModuleAddress, abi.encode(securityModuleInitData));
        
        // Transfer token ownership to security module
        IV4TokenBase(tokenAddress).transferOwnership(securityModuleAddress);
        
        emit TokenCreated(tokenAddress, name, symbol, owner);
        return tokenAddress;
    }
} 