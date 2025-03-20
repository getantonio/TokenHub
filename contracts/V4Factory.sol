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
    address public distributionModuleImplementation;
    
    // Beacon contracts for upgrades
    UpgradeableBeacon public tokenBeacon;
    UpgradeableBeacon public securityModuleBeacon;
    UpgradeableBeacon public distributionModuleBeacon;

    // Track deployment errors
    string public lastError;
    
    // Events
    event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner);
    event DeploymentError(string error, address sender);
    
    // Function selectors
    bytes4 private constant TOKEN_INITIALIZE_SELECTOR = bytes4(keccak256("initialize(string,string,uint256,address)"));
    bytes4 private constant MODULE_INITIALIZE_SELECTOR = bytes4(keccak256("initialize(address,bytes)"));
    
    /**
     * @dev Initialize the factory with implementation contracts
     * @param owner_ The owner of the factory
     * @param tokenImpl_ The token implementation address
     * @param securityModuleImpl_ The security module implementation address
     * @param distributionModuleImpl_ The distribution module implementation address
     */
    constructor(
        address owner_,
        address tokenImpl_,
        address securityModuleImpl_,
        address distributionModuleImpl_
    ) {
        require(tokenImpl_ != address(0), "Token implementation cannot be zero address");
        require(securityModuleImpl_ != address(0), "Security module implementation cannot be zero address");
        require(distributionModuleImpl_ != address(0), "Distribution module implementation cannot be zero address");
        
        _transferOwnership(owner_);
        
        tokenImplementation = tokenImpl_;
        securityModuleImplementation = securityModuleImpl_;
        distributionModuleImplementation = distributionModuleImpl_;
        
        tokenBeacon = new UpgradeableBeacon(tokenImplementation);
        securityModuleBeacon = new UpgradeableBeacon(securityModuleImplementation);
        distributionModuleBeacon = new UpgradeableBeacon(distributionModuleImplementation);
        
        tokenBeacon.transferOwnership(owner_);
        securityModuleBeacon.transferOwnership(owner_);
        distributionModuleBeacon.transferOwnership(owner_);
    }

    /**
     * @dev Set a new token implementation address
     * @param newTokenImpl The new token implementation address
     */
    function setTokenImplementation(address newTokenImpl) external onlyOwner {
        require(newTokenImpl != address(0), "Token implementation cannot be zero address");
        tokenBeacon.upgradeTo(newTokenImpl);
        tokenImplementation = newTokenImpl;
    }

    /**
     * @dev Set a new security module implementation address
     * @param newSecurityModuleImpl The new security module implementation address
     */
    function setSecurityModuleImplementation(address newSecurityModuleImpl) external onlyOwner {
        require(newSecurityModuleImpl != address(0), "Security module implementation cannot be zero address");
        securityModuleBeacon.upgradeTo(newSecurityModuleImpl);
        securityModuleImplementation = newSecurityModuleImpl;
    }

    /**
     * @dev Set a new distribution module implementation address
     * @param newDistributionModuleImpl The new distribution module implementation address
     */
    function setDistributionModuleImplementation(address newDistributionModuleImpl) external onlyOwner {
        require(newDistributionModuleImpl != address(0), "Distribution module implementation cannot be zero address");
        distributionModuleBeacon.upgradeTo(newDistributionModuleImpl);
        distributionModuleImplementation = newDistributionModuleImpl;
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
        
        try new BeaconProxy(
            address(tokenBeacon),
            tokenData
        ) returns (BeaconProxy tokenProxy) {
            tokenAddress = address(tokenProxy);
            
            // Create security module
            bytes32 securityModuleInitData = bytes32(uint256(uint160(owner)));
            bytes memory securityData = abi.encodeWithSelector(
                MODULE_INITIALIZE_SELECTOR,
                tokenAddress,
                abi.encode(securityModuleInitData)
            );
            
            try new BeaconProxy(
                address(securityModuleBeacon),
                securityData
            ) returns (BeaconProxy securityModuleProxy) {
                address securityModuleAddress = address(securityModuleProxy);
                
                // Add security module to token
                try IV4TokenBase(tokenAddress).addModule(securityModuleAddress, abi.encode(securityModuleInitData)) {
                    // Transfer token ownership to security module
                    try IV4TokenBase(tokenAddress).transferOwnership(securityModuleAddress) {
                        emit TokenCreated(tokenAddress, name, symbol, owner);
                        lastError = "";
                        return tokenAddress;
                    } catch Error(string memory error) {
                        lastError = string(abi.encodePacked("Error transferring ownership: ", error));
                        emit DeploymentError(lastError, msg.sender);
                        revert(lastError);
                    }
                } catch Error(string memory error) {
                    lastError = string(abi.encodePacked("Error adding module: ", error));
                    emit DeploymentError(lastError, msg.sender);
                    revert(lastError);
                }
            } catch Error(string memory error) {
                lastError = string(abi.encodePacked("Error creating security module proxy: ", error));
                emit DeploymentError(lastError, msg.sender);
                revert(lastError);
            } catch (bytes memory) {
                lastError = "Unknown error creating security module proxy";
                emit DeploymentError(lastError, msg.sender);
                revert(lastError);
            }
        } catch Error(string memory error) {
            lastError = string(abi.encodePacked("Error creating token proxy: ", error));
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        } catch (bytes memory) {
            lastError = "Unknown error creating token proxy";
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        }
    }

    /**
     * @dev Simplified token creation for testing purposes
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @return tokenAddress Address of the newly created token
     */
    function createTokenBasic(
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
        
        try new BeaconProxy(
            address(tokenBeacon),
            tokenData
        ) returns (BeaconProxy tokenProxy) {
            tokenAddress = address(tokenProxy);
            emit TokenCreated(tokenAddress, name, symbol, owner);
            lastError = "";
            return tokenAddress;
        } catch Error(string memory error) {
            lastError = string(abi.encodePacked("Error creating token: ", error));
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        } catch (bytes memory) {
            lastError = "Unknown error creating token";
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        }
    }

    /**
     * @dev Get all implementation and beacon addresses
     * @return _tokenImpl Token implementation address
     * @return _securityModuleImpl Security module implementation address
     * @return _distributionModuleImpl Distribution module implementation address
     * @return _tokenBeacon Token beacon address
     * @return _securityModuleBeacon Security module beacon address
     * @return _distributionModuleBeacon Distribution module beacon address
     */
    function getAddresses() external view returns (
        address _tokenImpl,
        address _securityModuleImpl,
        address _distributionModuleImpl,
        address _tokenBeacon,
        address _securityModuleBeacon,
        address _distributionModuleBeacon
    ) {
        return (
            tokenImplementation,
            securityModuleImplementation,
            distributionModuleImplementation,
            address(tokenBeacon),
            address(securityModuleBeacon),
            address(distributionModuleBeacon)
        );
    }

    /**
     * @dev Create a token specifically for the web interface (includes distribution flag)
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Flag for including distribution (not used in this version)
     * @return tokenAddress Address of the newly created token
     */
    function createTokenForWeb(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution
    ) external returns (address tokenAddress) {
        // Create token proxy
        bytes memory tokenData = abi.encodeWithSelector(
            TOKEN_INITIALIZE_SELECTOR,
            name,
            symbol,
            initialSupply,
            owner
        );
        
        try new BeaconProxy(
            address(tokenBeacon),
            tokenData
        ) returns (BeaconProxy tokenProxy) {
            tokenAddress = address(tokenProxy);
            emit TokenCreated(tokenAddress, name, symbol, owner);
            lastError = "";
            return tokenAddress;
        } catch Error(string memory error) {
            lastError = string(abi.encodePacked("Error creating token: ", error));
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        } catch (bytes memory) {
            lastError = "Unknown error creating token";
            emit DeploymentError(lastError, msg.sender);
            revert(lastError);
        }
    }
} 