// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./interfaces/IV4DistributionModule.sol";
import "./interfaces/IV4Module.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4DistributionModule
 * @dev Implementation of distribution module with allocation capabilities
 */
contract V4DistributionModule is 
    Initializable, 
    OwnableUpgradeable, 
    IV4DistributionModule,
    IV4Module
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // Token this module is attached to
    address private _token;
    
    // Allocation tracking
    EnumerableSetUpgradeable.AddressSet private _allocationWallets;
    mapping(address => Allocation) private _allocations;
    uint256 private _totalAllocated;
    bool private _distributionExecuted;
    
    // Preset definitions
    struct Preset {
        string name;
        uint256[] ratios;
        string[] labels;
        bool active;
    }
    
    mapping(uint256 => Preset) private _presets;
    uint256[] private _presetIds;
    
    // Version info
    string public constant VERSION = "4.0.0";
    
    // Events
    event AllocationAdded(address indexed wallet, uint256 amount, string label, bool locked, uint256 unlockTime);
    event AllocationRemoved(address indexed wallet);
    event AllocationModified(address indexed wallet, uint256 amount, string label, bool locked, uint256 unlockTime);
    event PresetApplied(uint256 indexed presetId, uint256 totalSupply);
    event DistributionExecuted(uint256 totalDistributed, uint256 walletCount);
    event TokensUnlocked(address indexed wallet, uint256 amount);
    
    /**
     * @dev Constructor that disables initialization on the implementation contract
     */
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the distribution module
     * @param tokenAddress Address of the token this module is attached to
     * @param owner Address of the initial owner
     */
    function initialize(address tokenAddress, address owner) public override initializer {
        __Ownable_init();
        _transferOwnership(owner);
        
        require(tokenAddress != address(0), "V4DistributionModule: token address cannot be zero");
        _token = tokenAddress;
        
        // Initialize presets
        _initializePresets();
    }
    
    /**
     * @dev Initialize the module
     * @param tokenAddress Address of the token this module is attached to
     * @param data Additional initialization data (owner address)
     */
    function initialize(address tokenAddress, bytes calldata data) external override initializer {
        require(data.length == 32, "V4DistributionModule: invalid initialization data");
        address owner = address(uint160(uint256(bytes32(data))));
        initialize(tokenAddress, owner);
    }
    
    /**
     * @dev Get the type of this module
     * @return moduleType Type identifier for this module
     */
    function getModuleType() external pure override returns (bytes32 moduleType) {
        return keccak256("DISTRIBUTION_MODULE");
    }
    
    /**
     * @dev Check if this module has a specific function
     * @param functionSig Function signature to check for
     * @return hasFunction Whether the module implements the function
     */
    function supportsFunction(bytes4 functionSig) external pure override returns (bool hasFunction) {
        return 
            functionSig == IV4DistributionModule.addAllocation.selector ||
            functionSig == IV4DistributionModule.addMultipleAllocations.selector ||
            functionSig == IV4DistributionModule.applyPreset.selector ||
            functionSig == IV4DistributionModule.removeAllocation.selector ||
            functionSig == IV4DistributionModule.modifyAllocation.selector ||
            functionSig == IV4DistributionModule.getAllAllocations.selector ||
            functionSig == IV4DistributionModule.getAllocation.selector ||
            functionSig == IV4DistributionModule.getAvailablePresets.selector ||
            functionSig == IV4DistributionModule.getPresetDetails.selector ||
            functionSig == IV4DistributionModule.executeDistribution.selector ||
            functionSig == IV4DistributionModule.unlockTokens.selector;
    }
    
    /**
     * @dev Get the token this module is attached to
     * @return tokenAddress Address of the token
     */
    function getToken() external view override returns (address tokenAddress) {
        return _token;
    }
    
    /**
     * @dev Add a new allocation
     * @param wallet Recipient wallet address
     * @param amount Amount of tokens to allocate
     * @param label Optional label for this allocation (e.g. "Team", "Marketing")
     * @param locked Whether the allocation should be time-locked
     * @param unlockTime Timestamp when tokens become unlocked (0 if not locked)
     * @return success Whether the allocation was successfully added
     */
    function addAllocation(
        address wallet, 
        uint256 amount, 
        string calldata label,
        bool locked,
        uint256 unlockTime
    ) external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(wallet != address(0), "V4DistributionModule: wallet cannot be zero address");
        require(amount > 0, "V4DistributionModule: amount must be greater than zero");
        require(!_allocationWallets.contains(wallet), "V4DistributionModule: wallet already has allocation");
        
        if (locked) {
            require(unlockTime > block.timestamp, "V4DistributionModule: unlock time must be in the future");
        }
        
        // Create and store the allocation
        Allocation memory allocation = Allocation({
            wallet: wallet,
            amount: amount,
            label: label,
            locked: locked,
            unlockTime: locked ? unlockTime : 0
        });
        
        _allocations[wallet] = allocation;
        _allocationWallets.add(wallet);
        _totalAllocated += amount;
        
        emit AllocationAdded(wallet, amount, label, locked, unlockTime);
        return true;
    }
    
    /**
     * @dev Add multiple allocations at once
     * @param wallets Array of recipient wallet addresses
     * @param amounts Array of token amounts
     * @param labels Array of labels
     * @param lockStatus Array of lock statuses
     * @param unlockTimes Array of unlock times
     * @return success Whether all allocations were successfully added
     */
    function addMultipleAllocations(
        address[] calldata wallets,
        uint256[] calldata amounts,
        string[] calldata labels,
        bool[] calldata lockStatus,
        uint256[] calldata unlockTimes
    ) external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(
            wallets.length == amounts.length && 
            wallets.length == labels.length && 
            wallets.length == lockStatus.length && 
            wallets.length == unlockTimes.length,
            "V4DistributionModule: array lengths must match"
        );
        
        for (uint256 i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "V4DistributionModule: wallet cannot be zero address");
            require(amounts[i] > 0, "V4DistributionModule: amount must be greater than zero");
            require(!_allocationWallets.contains(wallets[i]), "V4DistributionModule: wallet already has allocation");
            
            if (lockStatus[i]) {
                require(unlockTimes[i] > block.timestamp, "V4DistributionModule: unlock time must be in the future");
            }
            
            // Create and store the allocation
            Allocation memory allocation = Allocation({
                wallet: wallets[i],
                amount: amounts[i],
                label: labels[i],
                locked: lockStatus[i],
                unlockTime: lockStatus[i] ? unlockTimes[i] : 0
            });
            
            _allocations[wallets[i]] = allocation;
            _allocationWallets.add(wallets[i]);
            _totalAllocated += amounts[i];
            
            emit AllocationAdded(wallets[i], amounts[i], labels[i], lockStatus[i], unlockTimes[i]);
        }
        
        return true;
    }
    
    /**
     * @dev Apply a preset distribution
     * @param presetId Identifier for the distribution preset
     * @param totalSupply Total supply to distribute
     * @return success Whether the preset was successfully applied
     */
    function applyPreset(
        uint256 presetId,
        uint256 totalSupply
    ) external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(_presets[presetId].active, "V4DistributionModule: preset does not exist");
        
        // Clear any existing allocations
        _clearAllocations();
        
        Preset storage preset = _presets[presetId];
        uint256 totalRatio = 0;
        
        // Calculate total ratio
        for (uint256 i = 0; i < preset.ratios.length; i++) {
            totalRatio += preset.ratios[i];
        }
        
        require(totalRatio > 0, "V4DistributionModule: total ratio must be greater than zero");
        
        // Create allocations based on preset ratios
        for (uint256 i = 0; i < preset.ratios.length; i++) {
            // Skip zero ratios
            if (preset.ratios[i] == 0) continue;
            
            // Calculate amount based on ratio
            uint256 amount = (totalSupply * preset.ratios[i]) / totalRatio;
            
            // Create a placeholder allocation - user will need to set the actual wallet addresses
            address placeholderWallet = address(uint160(uint256(keccak256(abi.encodePacked(presetId, i)))));
            
            Allocation memory allocation = Allocation({
                wallet: placeholderWallet,
                amount: amount,
                label: preset.labels[i],
                locked: false,
                unlockTime: 0
            });
            
            _allocations[placeholderWallet] = allocation;
            _allocationWallets.add(placeholderWallet);
            _totalAllocated += amount;
            
            emit AllocationAdded(placeholderWallet, amount, preset.labels[i], false, 0);
        }
        
        emit PresetApplied(presetId, totalSupply);
        return true;
    }
    
    /**
     * @dev Remove an allocation
     * @param wallet Recipient wallet address to remove
     * @return success Whether the allocation was successfully removed
     */
    function removeAllocation(address wallet) external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(_allocationWallets.contains(wallet), "V4DistributionModule: wallet does not have allocation");
        
        uint256 amount = _allocations[wallet].amount;
        _totalAllocated -= amount;
        
        delete _allocations[wallet];
        _allocationWallets.remove(wallet);
        
        emit AllocationRemoved(wallet);
        return true;
    }
    
    /**
     * @dev Modify an existing allocation
     * @param wallet Recipient wallet address
     * @param amount New amount of tokens
     * @param label New label
     * @param locked New lock status
     * @param unlockTime New unlock time
     * @return success Whether the allocation was successfully modified
     */
    function modifyAllocation(
        address wallet,
        uint256 amount,
        string calldata label,
        bool locked,
        uint256 unlockTime
    ) external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(_allocationWallets.contains(wallet), "V4DistributionModule: wallet does not have allocation");
        require(amount > 0, "V4DistributionModule: amount must be greater than zero");
        
        if (locked) {
            require(unlockTime > block.timestamp, "V4DistributionModule: unlock time must be in the future");
        }
        
        // Update total allocated amount
        _totalAllocated = _totalAllocated - _allocations[wallet].amount + amount;
        
        // Update the allocation
        _allocations[wallet] = Allocation({
            wallet: wallet,
            amount: amount,
            label: label,
            locked: locked,
            unlockTime: locked ? unlockTime : 0
        });
        
        emit AllocationModified(wallet, amount, label, locked, unlockTime);
        return true;
    }
    
    /**
     * @dev Get all allocations
     * @return allocations Array of allocation details
     */
    function getAllAllocations() external view override returns (Allocation[] memory allocations) {
        uint256 count = _allocationWallets.length();
        allocations = new Allocation[](count);
        
        for (uint256 i = 0; i < count; i++) {
            address wallet = _allocationWallets.at(i);
            allocations[i] = _allocations[wallet];
        }
        
        return allocations;
    }
    
    /**
     * @dev Get allocation for a specific wallet
     * @param wallet Recipient wallet address
     * @return allocation The allocation details
     */
    function getAllocation(address wallet) external view override returns (Allocation memory allocation) {
        require(_allocationWallets.contains(wallet), "V4DistributionModule: wallet does not have allocation");
        return _allocations[wallet];
    }
    
    /**
     * @dev Get available presets
     * @return presetIds Array of preset IDs
     * @return presetNames Array of preset names
     */
    function getAvailablePresets() external view override returns (uint256[] memory presetIds, string[] memory presetNames) {
        uint256 activeCount = 0;
        
        // Count active presets
        for (uint256 i = 0; i < _presetIds.length; i++) {
            if (_presets[_presetIds[i]].active) {
                activeCount++;
            }
        }
        
        presetIds = new uint256[](activeCount);
        presetNames = new string[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < _presetIds.length; i++) {
            uint256 presetId = _presetIds[i];
            if (_presets[presetId].active) {
                presetIds[index] = presetId;
                presetNames[index] = _presets[presetId].name;
                index++;
            }
        }
        
        return (presetIds, presetNames);
    }
    
    /**
     * @dev Get preset details
     * @param presetId Identifier for the preset
     * @return walletRatios Array of ratios for different wallet types
     * @return labels Array of labels for the wallet types
     */
    function getPresetDetails(uint256 presetId) external view override returns (uint256[] memory walletRatios, string[] memory labels) {
        require(_presets[presetId].active, "V4DistributionModule: preset does not exist");
        
        Preset storage preset = _presets[presetId];
        return (preset.ratios, preset.labels);
    }
    
    /**
     * @dev Execute the distribution
     * @return success Whether the distribution was successfully executed
     */
    function executeDistribution() external override onlyOwner returns (bool success) {
        require(!_distributionExecuted, "V4DistributionModule: distribution already executed");
        require(_allocationWallets.length() > 0, "V4DistributionModule: no allocations to distribute");
        
        _distributionExecuted = true;
        uint256 walletCount = _allocationWallets.length();
        
        // Transfer tokens to each wallet
        for (uint256 i = 0; i < walletCount; i++) {
            address wallet = _allocationWallets.at(i);
            Allocation storage allocation = _allocations[wallet];
            
            // If tokens are locked, they stay in this contract until unlocked
            if (allocation.locked) {
                // Request tokens from the token contract to this module
                bytes memory mintData = abi.encodeWithSignature(
                    "mint(address,uint256)",
                    address(this),
                    allocation.amount
                );
                IV4TokenBase(_token).executeFromModule(_token, mintData);
            } else {
                // Mint directly to the recipient
                bytes memory mintData = abi.encodeWithSignature(
                    "mint(address,uint256)",
                    wallet,
                    allocation.amount
                );
                IV4TokenBase(_token).executeFromModule(_token, mintData);
            }
        }
        
        emit DistributionExecuted(_totalAllocated, walletCount);
        return true;
    }
    
    /**
     * @dev Unlock tokens for a wallet if the unlock time has passed
     * @param wallet Address of the wallet to unlock tokens for
     * @return success Whether the tokens were successfully unlocked
     */
    function unlockTokens(address wallet) external override returns (bool success) {
        require(_distributionExecuted, "V4DistributionModule: distribution not yet executed");
        require(_allocationWallets.contains(wallet), "V4DistributionModule: wallet does not have allocation");
        
        Allocation storage allocation = _allocations[wallet];
        require(allocation.locked, "V4DistributionModule: allocation is not locked");
        require(block.timestamp >= allocation.unlockTime, "V4DistributionModule: tokens are still locked");
        
        // Transfer tokens to the recipient
        (bool transferSuccess,) = _token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                wallet,
                allocation.amount
            )
        );
        require(transferSuccess, "V4DistributionModule: token transfer failed");
        
        // Mark as unlocked
        allocation.locked = false;
        
        emit TokensUnlocked(wallet, allocation.amount);
        return true;
    }
    
    /**
     * @dev Initialize the preset distributions
     */
    function _initializePresets() private {
        // Preset 1: Standard ICO Distribution
        uint256 presetId = 1;
        _presets[presetId] = Preset({
            name: "Standard ICO",
            ratios: new uint256[](5),
            labels: new string[](5),
            active: true
        });
        
        _presets[presetId].ratios[0] = 50; // 50% Public Sale
        _presets[presetId].ratios[1] = 20; // 20% Team
        _presets[presetId].ratios[2] = 15; // 15% Reserve
        _presets[presetId].ratios[3] = 10; // 10% Marketing
        _presets[presetId].ratios[4] = 5;  // 5% Advisors
        
        _presets[presetId].labels[0] = "Public Sale";
        _presets[presetId].labels[1] = "Team";
        _presets[presetId].labels[2] = "Reserve";
        _presets[presetId].labels[3] = "Marketing";
        _presets[presetId].labels[4] = "Advisors";
        
        _presetIds.push(presetId);
        
        // Preset 2: Community Focused
        presetId = 2;
        _presets[presetId] = Preset({
            name: "Community Focused",
            ratios: new uint256[](6),
            labels: new string[](6),
            active: true
        });
        
        _presets[presetId].ratios[0] = 40; // 40% Community Rewards
        _presets[presetId].ratios[1] = 20; // 20% Public Sale
        _presets[presetId].ratios[2] = 15; // 15% Team
        _presets[presetId].ratios[3] = 10; // 10% Development
        _presets[presetId].ratios[4] = 10; // 10% Marketing
        _presets[presetId].ratios[5] = 5;  // 5% Advisors
        
        _presets[presetId].labels[0] = "Community Rewards";
        _presets[presetId].labels[1] = "Public Sale";
        _presets[presetId].labels[2] = "Team";
        _presets[presetId].labels[3] = "Development";
        _presets[presetId].labels[4] = "Marketing";
        _presets[presetId].labels[5] = "Advisors";
        
        _presetIds.push(presetId);
        
        // Preset 3: DeFi Project
        presetId = 3;
        _presets[presetId] = Preset({
            name: "DeFi Project",
            ratios: new uint256[](7),
            labels: new string[](7),
            active: true
        });
        
        _presets[presetId].ratios[0] = 30; // 30% Liquidity Provision
        _presets[presetId].ratios[1] = 25; // 25% Community Incentives
        _presets[presetId].ratios[2] = 15; // 15% Team
        _presets[presetId].ratios[3] = 10; // 10% Public Sale
        _presets[presetId].ratios[4] = 10; // 10% Development
        _presets[presetId].ratios[5] = 5;  // 5% Marketing
        _presets[presetId].ratios[6] = 5;  // 5% Partnerships
        
        _presets[presetId].labels[0] = "Liquidity Provision";
        _presets[presetId].labels[1] = "Community Incentives";
        _presets[presetId].labels[2] = "Team";
        _presets[presetId].labels[3] = "Public Sale";
        _presets[presetId].labels[4] = "Development";
        _presets[presetId].labels[5] = "Marketing";
        _presets[presetId].labels[6] = "Partnerships";
        
        _presetIds.push(presetId);
        
        // Preset 4: Equal Distribution
        presetId = 4;
        _presets[presetId] = Preset({
            name: "Equal Distribution",
            ratios: new uint256[](4),
            labels: new string[](4),
            active: true
        });
        
        _presets[presetId].ratios[0] = 25; // 25% Public
        _presets[presetId].ratios[1] = 25; // 25% Team
        _presets[presetId].ratios[2] = 25; // 25% Development
        _presets[presetId].ratios[3] = 25; // 25% Marketing
        
        _presets[presetId].labels[0] = "Public";
        _presets[presetId].labels[1] = "Team";
        _presets[presetId].labels[2] = "Development";
        _presets[presetId].labels[3] = "Marketing";
        
        _presetIds.push(presetId);
    }
    
    /**
     * @dev Clear all existing allocations
     */
    function _clearAllocations() private {
        uint256 count = _allocationWallets.length();
        
        for (uint256 i = 0; i < count; i++) {
            address wallet = _allocationWallets.at(0); // Always remove the first one
            delete _allocations[wallet];
            _allocationWallets.remove(wallet);
            
            emit AllocationRemoved(wallet);
        }
        
        _totalAllocated = 0;
    }
} 