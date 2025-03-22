// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./V4Factory.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4FactoryWithLiquidity 
 * @dev Extended V4Factory that ensures proper module ordering
 * This version fixes the issue with distribution module not being properly initialized
 * by ensuring all modules are created before any ownership transfers happen
 */
contract V4FactoryWithLiquidity is V4Factory {
    /**
     * @dev Initialize the factory with implementation contracts
     * @param owner_ The owner of the factory
     * @param tokenImpl_ The token implementation address
     * @param securityModuleImpl_ The security module implementation address
     * @param distributionModuleImpl_ The distribution module implementation address
     * @param liquidityModuleImpl_ The liquidity module implementation address
     */
    constructor(
        address owner_,
        address tokenImpl_,
        address securityModuleImpl_,
        address distributionModuleImpl_,
        address liquidityModuleImpl_
    ) V4Factory(
        owner_,
        tokenImpl_,
        securityModuleImpl_,
        distributionModuleImpl_,
        liquidityModuleImpl_
    ) {}
    
    /**
     * @dev Overridden createTokenForWeb implementation with enhanced error handling
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Flag to include distribution module
     * @return tokenAddress Address of the newly created token
     */
    function createTokenForWeb(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution
    ) external virtual override returns (address tokenAddress) {
        // Create token proxy with factory as initial owner
        bytes memory tokenData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,uint256,address)")),
            name,
            symbol,
            initialSupply,
            address(this) // Important: Initialize with factory as owner, not the final owner
        );
        
        try new BeaconProxy(
            address(tokenBeacon),
            tokenData
        ) returns (BeaconProxy tokenProxy) {
            tokenAddress = address(tokenProxy);
            
            // Create and add security module
            bytes32 moduleInitData = bytes32(uint256(uint160(owner)));
            
            // Create all modules first before adding them
            address securityModuleAddress;
            address distributionModuleAddress;
            address liquidityModuleAddress;
            
            // Create security module
            securityModuleAddress = _createModule(
                tokenAddress, 
                securityModuleBeacon, 
                moduleInitData, 
                "security module"
            );
            
            if (securityModuleAddress == address(0)) {
                // Module creation failed, but error already emitted
                return address(0);
            }
            
            // Create distribution module if requested
            if (includeDistribution) {
                distributionModuleAddress = _createModule(
                    tokenAddress, 
                    distributionModuleBeacon, 
                    moduleInitData, 
                    "distribution module"
                );
                
                if (distributionModuleAddress == address(0)) {
                    // Module creation failed, but error already emitted
                    return address(0);
                }
            }
            
            // Create liquidity module
            liquidityModuleAddress = _createModule(
                tokenAddress, 
                liquidityModuleBeacon, 
                moduleInitData, 
                "liquidity module"
            );
            
            if (liquidityModuleAddress == address(0)) {
                // Module creation failed, but error already emitted
                return address(0);
            }
            
            // Now add all modules to the token (token is owned by factory)
            
            // Add security module first
            try IV4TokenBase(tokenAddress).addModule(securityModuleAddress, abi.encode(moduleInitData)) {
                // Security module added successfully
            } catch Error(string memory error) {
                lastError = string(abi.encodePacked("Error adding security module: ", error));
                emit DeploymentError(lastError, msg.sender);
                return address(0);
            }
            
            // Add distribution module next if requested
            if (includeDistribution && distributionModuleAddress != address(0)) {
                try IV4TokenBase(tokenAddress).addModule(distributionModuleAddress, abi.encode(moduleInitData)) {
                    // Distribution module added successfully
                } catch Error(string memory error) {
                    lastError = string(abi.encodePacked("Error adding distribution module: ", error));
                    emit DeploymentError(lastError, msg.sender);
                    return address(0);
                }
            }
            
            // Add liquidity module last
            try IV4TokenBase(tokenAddress).addModule(liquidityModuleAddress, abi.encode(moduleInitData)) {
                // Liquidity module added successfully
            } catch Error(string memory error) {
                lastError = string(abi.encodePacked("Error adding liquidity module: ", error));
                emit DeploymentError(lastError, msg.sender);
                return address(0);
            }
            
            // Only transfer ownership to security module after all modules added
            try IV4TokenBase(tokenAddress).transferOwnership(securityModuleAddress) {
                emit TokenCreated(tokenAddress, name, symbol, owner);
                lastError = "";
                return tokenAddress;
            } catch Error(string memory error) {
                lastError = string(abi.encodePacked("Error transferring ownership: ", error));
                emit DeploymentError(lastError, msg.sender);
                return address(0);
            }
        } catch Error(string memory error) {
            lastError = string(abi.encodePacked("Error creating token: ", error));
            emit DeploymentError(lastError, msg.sender);
            return address(0);
        } catch (bytes memory) {
            lastError = "Unknown error creating token";
            emit DeploymentError(lastError, msg.sender);
            return address(0);
        }
    }
} 