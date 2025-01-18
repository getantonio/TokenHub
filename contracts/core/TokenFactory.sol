// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BaseToken.sol";
import "./TokenVesting.sol";

contract TokenFactory is Ownable, ReentrancyGuard {
    // Token creation fee
    uint256 public creationFee;
    
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
    }

    // Events
    event TokenCreated(address indexed tokenAddress, string name, string symbol);
    event VestingScheduleCreated(address indexed tokenAddress, address indexed vestingContract, address beneficiary);
    event CreationFeeUpdated(uint256 newFee);

    constructor(uint256 _creationFee) {
        creationFee = _creationFee;
    }

    /**
     * @dev Creates a new token with the specified configuration
     * @param config Token configuration parameters
     */
    function createToken(TokenConfig calldata config) external payable nonReentrant {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(config.initialSupply <= config.maxSupply, "Initial supply exceeds max supply");
        require(config.teamWallet != address(0), "Invalid team wallet");

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

        // Calculate team allocation
        uint256 teamTokens = (config.maxSupply * config.teamAllocation) / 100;

        // Create vesting contract for team tokens
        if (teamTokens > 0 && config.teamVestingDuration > 0) {
            // Convert months to seconds for vesting duration and cliff
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

            // Transfer team tokens to vesting contract
            newToken.transfer(address(vesting), teamTokens);
            
            // Set the vesting amount
            vesting.setTotalAmount(teamTokens);
            
            // Transfer vesting contract ownership to token owner
            vesting.transferOwnership(msg.sender);

            emit VestingScheduleCreated(address(newToken), address(vesting), config.teamWallet);
        }

        // Transfer token ownership to creator
        newToken.transferOwnership(msg.sender);

        emit TokenCreated(address(newToken), config.name, config.symbol);
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
} 