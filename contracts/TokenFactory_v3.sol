// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Token_v3.sol";

contract TokenFactory_v3 is Ownable, ReentrancyGuard, Pausable {
    uint256 public constant VERSION = 3;
    uint256 public deploymentFee = 0.001 ether; // Default fee of 0.001 BNB
    uint256 public totalTokensCreated;
    mapping(address => uint256) public userTokenCount;
    mapping(address => address[]) public userTokens;
    
    struct WalletAllocation {
        address wallet;
        uint256 percentage;
        bool vestingEnabled;
        uint256 vestingDuration;
        uint256 cliffDuration;
        uint256 vestingStartTime;
    }

    struct TokenParams {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 maxSupply;
        address owner;
        bool enableBlacklist;
        bool enableTimeLock;
        uint256 presaleRate;
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 startTime;
        uint256 endTime;
        uint256 presalePercentage;
        uint256 liquidityPercentage;
        uint256 liquidityLockDuration;
        WalletAllocation[] walletAllocations;
        uint256 maxActivePresales;
        bool presaleEnabled;
    }

    event TokenCreated(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool presaleEnabled
    );

    event DeploymentFeeUpdated(
        uint256 oldFee,
        uint256 newFee,
        address indexed admin
    );

    event EmergencyWithdraw(
        address indexed admin,
        uint256 amount,
        uint256 timestamp
    );

    constructor() {
        _pause(); // Start paused for safety
    }

    function createToken(TokenParams calldata params) external payable nonReentrant whenNotPaused returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        
        // Validate basic parameters
        require(bytes(params.name).length > 0, "Name required");
        require(bytes(params.symbol).length > 0, "Symbol required");
        require(params.initialSupply > 0, "Initial supply must be > 0");
        require(params.maxSupply >= params.initialSupply, "Max supply must be >= initial supply");
        require(params.owner != address(0), "Invalid owner address");
        
        // Validate presale parameters
        if (params.presaleEnabled) {
            require(params.presalePercentage == 5, "Presale must be 5% when enabled");
            require(params.presaleRate > 0, "Presale rate must be > 0");
            require(params.softCap > 0 && params.hardCap > params.softCap, "Invalid caps");
            require(params.minContribution > 0 && params.maxContribution > params.minContribution, "Invalid contribution limits");
            require(params.startTime > block.timestamp && params.endTime > params.startTime, "Invalid presale times");
            require(params.maxActivePresales > 0, "Max active presales must be > 0 when presale is enabled");
        } else {
            require(params.presalePercentage == 0, "Presale must be 0% when disabled");
            require(params.maxActivePresales == 0, "Max active presales must be 0 when presale is disabled");
        }

        // Validate distribution percentages
        uint256 totalPercentage = params.presalePercentage + params.liquidityPercentage;
        for (uint256 i = 0; i < params.walletAllocations.length; i++) {
            totalPercentage += params.walletAllocations[i].percentage;
            
            if (params.walletAllocations[i].vestingEnabled) {
                require(params.walletAllocations[i].vestingDuration > 0, "Invalid vesting duration");
                require(params.walletAllocations[i].vestingStartTime > block.timestamp, "Invalid vesting start");
            }
        }
        require(totalPercentage == 100, "Total allocation must be 100%");

        // Create token
        Token_v3 token = new Token_v3(
            params.name,
            params.symbol,
            params.initialSupply,
            params.maxSupply,
            params.owner,
            params.enableBlacklist,
            params.enableTimeLock,
            params.presaleEnabled,
            params.maxActivePresales
        );

        // Configure token
        if (params.presaleEnabled) {
            token.configurePresale(
                params.presaleRate,
                params.softCap,
                params.hardCap,
                params.minContribution,
                params.maxContribution,
                params.startTime,
                params.endTime
            );
        }

        // Configure distribution
        token.configureDistribution(
            params.presalePercentage,
            params.liquidityPercentage,
            params.liquidityLockDuration,
            params.walletAllocations
        );

        // Update tracking
        userTokenCount[msg.sender]++;
        userTokens[msg.sender].push(address(token));
        totalTokensCreated++;

        emit TokenCreated(
            msg.sender,
            address(token),
            params.name,
            params.symbol,
            params.initialSupply,
            params.maxSupply,
            params.presaleEnabled
        );

        return address(token);
    }

    // Admin functions
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be > 0");
        uint256 oldFee = deploymentFee;
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(oldFee, newFee, msg.sender);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdraw(msg.sender, balance, block.timestamp);
    }

    // View functions
    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    function getTokenCount(address user) external view returns (uint256) {
        return userTokenCount[user];
    }

    // Receive function
    receive() external payable {}
} 