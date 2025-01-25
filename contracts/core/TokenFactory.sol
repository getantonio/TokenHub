// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BaseToken.sol";
import "./TokenVesting.sol";

contract TokenFactory is Ownable, ReentrancyGuard {
    // Token creation fee
    uint256 public creationFee;
    uint256 public constant TARGET_USD_FEE = 100; // $100 in USD
    
    // Fee tiers for additional features
    uint256 public antiBotFee;
    uint256 public vestingFee;
    
    // Platform team configuration
    address public platformTeamWallet;
    uint256 public platformTeamAllocation = 2; // 2% default allocation
    
    // Fee sharing configuration
    mapping(address => uint256) public partnerShares; // Share percentage for platform partners
    
    // Mapping for discounted addresses
    mapping(address => uint256) public discountedFees;
    
    // Constants for allocation limits
    uint256 public constant MAX_TEAM_ALLOCATION = 30; // 30%
    uint256 public constant MAX_MARKETING_ALLOCATION = 15; // 15%
    uint256 public constant MAX_DEVELOPER_ALLOCATION = 10; // 10%
    uint256 public constant MIN_ALLOCATION = 1; // 1%
    
    // Liquidity configuration
    uint256 public constant MIN_LIQUIDITY_LOCK = 180 days;
    mapping(address => uint256) public liquidityLockTime;
    
    // Struct to store token configuration
    struct TokenConfig {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 initialSupply;
        uint256 tokenPrice;
        uint256 maxTransferAmount;
        uint256 cooldownTime;
        bool transfersEnabled;
        bool antiBot;
        // Vesting configuration
        uint256 teamVestingDuration;
        uint256 teamVestingCliff;
        uint256 teamAllocation;
        address teamWallet;
        // Marketing configuration
        uint256 marketingAllocation;
        address marketingWallet;
        // Developer configuration
        uint256 developerAllocation;
        address developerWallet;
        // Liquidity configuration
        uint256 liquidityAllocation;
        uint256 liquidityLockDuration;
    }

    // Events
    event TokenCreated(address indexed tokenAddress, string name, string symbol, bool hasAntiBot);
    event VestingScheduleCreated(address indexed tokenAddress, address indexed vestingContract, address beneficiary);
    event CreationFeeUpdated(uint256 newFee);
    event DiscountSet(address indexed user, uint256 discountedFee);
    event PlatformTeamWalletUpdated(address newWallet);
    event PlatformTeamAllocationUpdated(uint256 newAllocation);
    event PartnerShareUpdated(address indexed partner, uint256 share);
    event LiquidityLocked(address indexed token, uint256 amount, uint256 unlockTime);

    constructor(uint256 _initialFee) {
        creationFee = _initialFee;
        antiBotFee = _initialFee / 2; // 50% of base fee
        vestingFee = _initialFee / 4; // 25% of base fee
        platformTeamWallet = msg.sender; // Set deployer as initial platform team wallet
    }

    function setPlatformTeamWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet address");
        platformTeamWallet = _wallet;
        emit PlatformTeamWalletUpdated(_wallet);
    }

    function setPlatformTeamAllocation(uint256 _allocation) external onlyOwner {
        require(_allocation <= 5, "Max 5% platform allocation");
        platformTeamAllocation = _allocation;
        emit PlatformTeamAllocationUpdated(_allocation);
    }

    /**
     * @dev Creates a new token with the specified configuration
     * @param config Token configuration parameters
     */
    function createToken(TokenConfig calldata config) external payable nonReentrant {
        uint256 totalFee = calculateTotalFee(config, msg.sender);
        require(msg.value >= totalFee, "Insufficient creation fee");
        
        // Validate allocations
        require(config.teamAllocation >= MIN_ALLOCATION && config.teamAllocation <= MAX_TEAM_ALLOCATION, 
                "Invalid team allocation");
        require(config.marketingAllocation <= MAX_MARKETING_ALLOCATION, 
                "Marketing allocation too high");
        require(config.developerAllocation <= MAX_DEVELOPER_ALLOCATION, 
                "Developer allocation too high");
                
        // Validate liquidity configuration
        if (config.liquidityAllocation > 0) {
            require(config.liquidityLockDuration >= MIN_LIQUIDITY_LOCK, 
                    "Liquidity lock too short");
            require(config.liquidityAllocation <= 50, 
                    "Max 50% liquidity allocation");
        }
        
        // Validate total allocation including liquidity
        uint256 totalAllocation = config.teamAllocation + 
                                 config.marketingAllocation + 
                                 config.developerAllocation + 
                                 config.liquidityAllocation +
                                 platformTeamAllocation;
        require(totalAllocation <= 100, "Total allocation exceeds 100%");

        // Create the token
        BaseToken newToken = new BaseToken(
            config.name,
            config.symbol,
            config.maxSupply,
            config.initialSupply,
            config.tokenPrice
        );

        // Set token parameters
        if (config.maxTransferAmount > 0) {
            newToken.setMaxTransferAmount(config.maxTransferAmount);
        }
        if (config.cooldownTime > 0) {
            newToken.setCooldownTime(config.cooldownTime);
        }
        newToken.setTransfersEnabled(config.transfersEnabled);

        // Enable anti-bot if requested
        if (config.antiBot) {
            newToken.setAntiBot(true);
        }

        // Calculate and distribute team allocation
        uint256 teamTokens = (config.maxSupply * config.teamAllocation) / 100;
        if (teamTokens > 0 && config.teamVestingDuration > 0) {
            uint256 vestingDuration = config.teamVestingDuration * 30 days;
            uint256 vestingCliff = config.teamVestingCliff * 30 days;

            TokenVesting vesting = new TokenVesting(
                address(newToken),
                config.teamWallet,
                block.timestamp,
                vestingCliff,
                vestingDuration,
                true // Make it revocable
            );

            newToken.transfer(address(vesting), teamTokens);
            vesting.setTotalAmount(teamTokens);
            vesting.transferOwnership(msg.sender);

            emit VestingScheduleCreated(address(newToken), address(vesting), config.teamWallet);
        }

        // Handle platform team allocation
        if (platformTeamWallet != address(0) && platformTeamAllocation > 0) {
            uint256 platformTokens = (config.maxSupply * platformTeamAllocation) / 100;
            newToken.transfer(platformTeamWallet, platformTokens);
        }

        // Handle marketing allocation
        if (config.marketingAllocation > 0) {
            uint256 marketingTokens = (config.maxSupply * config.marketingAllocation) / 100;
            newToken.transfer(config.marketingWallet, marketingTokens);
        }

        // Handle developer allocation
        if (config.developerAllocation > 0) {
            uint256 developerTokens = (config.maxSupply * config.developerAllocation) / 100;
            newToken.transfer(config.developerWallet, developerTokens);
        }

        // Handle liquidity allocation and locking
        if (config.liquidityAllocation > 0) {
            uint256 liquidityTokens = (config.maxSupply * config.liquidityAllocation) / 100;
            liquidityLockTime[address(newToken)] = block.timestamp + config.liquidityLockDuration;
            newToken.lockTokens(msg.sender, liquidityTokens, config.liquidityLockDuration);
            emit LiquidityLocked(address(newToken), liquidityTokens, liquidityLockTime[address(newToken)]);
        }

        // Transfer token ownership to creator
        newToken.transferOwnership(msg.sender);

        emit TokenCreated(address(newToken), config.name, config.symbol, config.antiBot);
        
        // Distribute fees to partners if any
        distributeFees();
    }

    function calculateTotalFee(TokenConfig calldata config, address user) public view returns (uint256) {
        uint256 baseFee = getCreationFee(user);
        uint256 totalFee = baseFee;
        
        if (config.antiBot) {
            totalFee += antiBotFee;
        }
        
        if (config.teamVestingDuration > 0) {
            totalFee += vestingFee;
        }
        
        return totalFee;
    }

    /**
     * @dev Updates the creation fee based on ETH/USD price
     * @param _ethPriceInUsd Current ETH price in USD (with 8 decimals)
     */
    function updateFeeFromEthPrice(uint256 _ethPriceInUsd) external onlyOwner {
        // Calculate fee in ETH to equal $100
        // _ethPriceInUsd has 8 decimals, so we multiply TARGET_USD_FEE by 1e26 and divide by price
        creationFee = (TARGET_USD_FEE * 1e26) / _ethPriceInUsd;
        emit CreationFeeUpdated(creationFee);
    }

    /**
     * @dev Sets a custom creation fee for a specific address
     * @param user Address to set discount for
     * @param discountedFee The discounted fee amount (0 for free)
     */
    function setDiscountedFee(address user, uint256 discountedFee) external onlyOwner {
        require(discountedFee <= creationFee, "Discounted fee cannot be higher than regular fee");
        discountedFees[user] = discountedFee;
        emit DiscountSet(user, discountedFee);
    }

    /**
     * @dev Gets the creation fee for a specific address
     * @param user Address to check
     */
    function getCreationFee(address user) public view returns (uint256) {
        // Owner is exempt from fees
        if (user == owner()) {
            return 0;
        }
        // Check for discounted fee
        uint256 discountedFee = discountedFees[user];
        return discountedFee > 0 ? discountedFee : creationFee;
    }

    /**
     * @dev Updates the creation fee
     * @param _newFee New fee amount
     */
    function updateCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
        emit CreationFeeUpdated(_newFee);
    }

    /**
     * @dev Withdraws collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }

    function setPartnerShare(address partner, uint256 sharePercentage) external onlyOwner {
        require(sharePercentage <= 50, "Share cannot exceed 50%");
        partnerShares[partner] = sharePercentage;
        emit PartnerShareUpdated(partner, sharePercentage);
    }

    function distributeFees() internal {
        uint256 totalFees = msg.value;
        uint256 remainingFees = totalFees;
        
        // Distribute to partners
        for (address partner : getPartners()) {
            if (partnerShares[partner] > 0) {
                uint256 partnerFee = (totalFees * partnerShares[partner]) / 100;
                remainingFees -= partnerFee;
                (bool success, ) = partner.call{value: partnerFee}("");
                require(success, "Partner fee transfer failed");
            }
        }
        
        // Transfer remaining fees to owner
        if (remainingFees > 0) {
            (bool success, ) = owner().call{value: remainingFees}("");
            require(success, "Owner fee transfer failed");
        }
    }

    function getPartners() internal view returns (address[] memory) {
        // Implementation to return array of partners
        // This is a placeholder - actual implementation would maintain a list of partners
        return new address[](0);
    }

    function isLiquidityLocked(address token) public view returns (bool) {
        return block.timestamp < liquidityLockTime[token];
    }
} 