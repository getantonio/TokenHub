// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./V4FactoryWithLiquidity.sol";
import "./interfaces/IV4DistributionModule.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4FactoryWithLiquidityFixedV4
 * @dev Extended V4FactoryWithLiquidity that accepts custom distribution data
 * This version allows specifying custom distribution allocations from the frontend
 */
contract V4FactoryWithLiquidityFixedV4 is V4FactoryWithLiquidity {
    /**
     * @dev Struct to store wallet allocation data
     */
    struct WalletAllocation {
        address wallet;
        uint256 percentage;
        string label;
        bool vesting;
        uint256 vestingDuration;
        uint256 cliffDuration;
    }
    
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
    ) V4FactoryWithLiquidity(
        owner_,
        tokenImpl_,
        securityModuleImpl_,
        distributionModuleImpl_,
        liquidityModuleImpl_
    ) {}
    
    /**
     * @dev External function to create a token with custom distribution settings
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Flag to include distribution module
     * @param walletAllocations Array of wallet allocations
     * @return tokenAddress Address of the newly created token
     */
    function createTokenWithDistribution(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution,
        WalletAllocation[] memory walletAllocations
    ) external returns (address tokenAddress) {
        return _createTokenWithDistribution(name, symbol, initialSupply, owner, includeDistribution, walletAllocations);
    }
    
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
        // Create default allocations if no custom ones provided
        WalletAllocation[] memory defaultAllocations = new WalletAllocation[](1);
        defaultAllocations[0] = WalletAllocation({
            wallet: owner,
            percentage: 100, // 100% to owner
            label: "Owner",
            vesting: false,
            vestingDuration: 0,
            cliffDuration: 0
        });
        
        return _createTokenWithDistribution(name, symbol, initialSupply, owner, includeDistribution, defaultAllocations);
    }
    
    /**
     * @dev Internal function to create a token with distribution settings
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint
     * @param owner Owner of the new token
     * @param includeDistribution Flag to include distribution module
     * @param walletAllocations Array of wallet allocations
     * @return tokenAddress Address of the newly created token
     */
    function _createTokenWithDistribution(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner,
        bool includeDistribution,
        WalletAllocation[] memory walletAllocations
    ) internal returns (address tokenAddress) {
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
                    
                    // Setup wallet allocations
                    for (uint256 i = 0; i < walletAllocations.length; i++) {
                        WalletAllocation memory allocation = walletAllocations[i];
                        
                        // Calculate token amount based on percentage
                        uint256 tokenAmount = initialSupply * allocation.percentage / 100;
                        
                        // Skip allocations with 0 percentage
                        if (tokenAmount == 0) continue;
                        
                        // Set unlock time based on vesting parameters
                        uint256 unlockTime = 0;
                        if (allocation.vesting) {
                            // Calculate unlock time
                            unlockTime = block.timestamp + (allocation.vestingDuration * 1 days);
                        }
                        
                        try IV4DistributionModule(distributionModuleAddress).addAllocation(
                            allocation.wallet,
                            tokenAmount,
                            allocation.label,
                            allocation.vesting,
                            unlockTime
                        ) {
                            // Allocation added successfully
                        } catch Error(string memory error) {
                            lastError = string(abi.encodePacked("Error adding allocation for ", allocation.label, ": ", error));
                            emit DeploymentError(lastError, msg.sender);
                            // Continue with other allocations despite error
                        }
                    }
                    
                    // Execute the distribution
                    try IV4DistributionModule(distributionModuleAddress).executeDistribution() {
                        // Distribution executed successfully
                    } catch Error(string memory error) {
                        lastError = string(abi.encodePacked("Error executing distribution: ", error));
                        emit DeploymentError(lastError, msg.sender);
                        // Continue despite error - non-critical
                    }
                    
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