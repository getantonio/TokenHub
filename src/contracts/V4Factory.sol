// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IV4TokenBase.sol";
import "./V4TokenBase.sol";
import "./V4SecurityModule.sol";
import "./V4DistributionModule.sol";

/**
 * @title V4Factory
 * @dev Factory for creating V4 tokens with modular architecture
 */
contract V4Factory is Ownable {
    // Implementation addresses
    address public tokenImplementation;
    address public securityModuleImplementation;
    address public distributionModuleImplementation;
    
    // Beacon contracts for upgrades
    UpgradeableBeacon public tokenBeacon;
    UpgradeableBeacon public securityModuleBeacon;
    UpgradeableBeacon public distributionModuleBeacon;
    
    // Token registry
    mapping(address => bool) public isV4Token;
    address[] public allTokens;
    
    // Version info
    string public constant VERSION = "4.0.0";
    
    // Events
    event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner);
    event ImplementationUpgraded(address indexed implementation, string implementationType);
    
    /**
     * @dev Initialize the factory with implementation contracts
     * @param owner_ The owner of the factory
     */
    constructor(address owner_) {
        _transferOwnership(owner_);
        
        // Deploy implementations
        tokenImplementation = address(new V4TokenBase());
        securityModuleImplementation = address(new V4SecurityModule());
        distributionModuleImplementation = address(new V4DistributionModule());
        
        // Create beacons
        tokenBeacon = new UpgradeableBeacon(tokenImplementation);
        securityModuleBeacon = new UpgradeableBeacon(securityModuleImplementation);
        distributionModuleBeacon = new UpgradeableBeacon(distributionModuleImplementation);
        
        // Transfer beacon ownership to the factory owner
        tokenBeacon.transferOwnership(owner_);
        securityModuleBeacon.transferOwnership(owner_);
        distributionModuleBeacon.transferOwnership(owner_);
    }
    
    /**
     * @dev Create a new V4 token with default modules
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Whether to include the distribution module
     * @return tokenAddress Address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution
    ) external returns (address tokenAddress) {
        // Create a new token proxy
        bytes memory tokenData = abi.encodeWithSelector(
            V4TokenBase.initialize.selector,
            name,
            symbol,
            includeDistribution ? 0 : initialSupply, // If using distribution, don't mint initially
            address(this) // Factory temporarily owns the token for setup
        );
        
        BeaconProxy tokenProxy = new BeaconProxy(
            address(tokenBeacon),
            tokenData
        );
        tokenAddress = address(tokenProxy);
        
        // Create security module
        bytes memory securityData = abi.encode(owner);
        
        BeaconProxy securityModuleProxy = new BeaconProxy(
            address(securityModuleBeacon),
            ""
        );
        address securityModuleAddress = address(securityModuleProxy);
        
        // Initialize the security module
        V4SecurityModule(securityModuleAddress).initialize(tokenAddress, owner);
        
        // Add security module to token
        IV4TokenBase(tokenAddress).addModule(securityModuleAddress, securityData);
        
        // Create distribution module if requested
        if (includeDistribution) {
            bytes memory distributionData = abi.encode(owner);
            
            BeaconProxy distributionModuleProxy = new BeaconProxy(
                address(distributionModuleBeacon),
                ""
            );
            address distributionModuleAddress = address(distributionModuleProxy);
            
            // Initialize the distribution module
            V4DistributionModule(distributionModuleAddress).initialize(tokenAddress, owner);
            
            // Add distribution module to token
            IV4TokenBase(tokenAddress).addModule(distributionModuleAddress, distributionData);
        }
        
        // Transfer token ownership to the security module
        V4TokenBase(tokenAddress).transferOwnership(securityModuleAddress);
        
        // Register the token
        isV4Token[tokenAddress] = true;
        allTokens.push(tokenAddress);
        
        emit TokenCreated(tokenAddress, name, symbol, owner);
        
        return tokenAddress;
    }
    
    /**
     * @dev Upgrade the token implementation
     * @param newImplementation Address of the new implementation
     */
    function upgradeTokenImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "V4Factory: implementation cannot be zero address");
        tokenBeacon.upgradeTo(newImplementation);
        tokenImplementation = newImplementation;
        
        emit ImplementationUpgraded(newImplementation, "TOKEN");
    }
    
    /**
     * @dev Upgrade the security module implementation
     * @param newImplementation Address of the new implementation
     */
    function upgradeSecurityModuleImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "V4Factory: implementation cannot be zero address");
        securityModuleBeacon.upgradeTo(newImplementation);
        securityModuleImplementation = newImplementation;
        
        emit ImplementationUpgraded(newImplementation, "SECURITY_MODULE");
    }
    
    /**
     * @dev Upgrade the distribution module implementation
     * @param newImplementation Address of the new implementation
     */
    function upgradeDistributionModuleImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "V4Factory: implementation cannot be zero address");
        distributionModuleBeacon.upgradeTo(newImplementation);
        distributionModuleImplementation = newImplementation;
        
        emit ImplementationUpgraded(newImplementation, "DISTRIBUTION_MODULE");
    }
    
    /**
     * @dev Get all tokens created by this factory
     * @return tokens Array of token addresses
     */
    function getAllTokens() external view returns (address[] memory tokens) {
        return allTokens;
    }
    
    /**
     * @dev Get the number of tokens created by this factory
     * @return count Token count
     */
    function getTokenCount() external view returns (uint256 count) {
        return allTokens.length;
    }
} 