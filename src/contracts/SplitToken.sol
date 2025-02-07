// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SplitToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address[] memory wallets,
        uint256[] memory percentages
    ) ERC20(name, symbol) Ownable() {
        require(wallets.length > 0, "Must provide at least one wallet");
        require(wallets.length == percentages.length, "Wallets and percentages length mismatch");
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            require(wallets[i] != address(0), "Wallet cannot be zero address");
            totalPercentage += percentages[i];
        }
        require(totalPercentage == 100, "Total percentage must equal 100");

        // Track remaining tokens to handle rounding
        uint256 remainingTokens = totalSupply;
        
        // Mint tokens to each wallet according to their percentage
        for (uint256 i = 0; i < wallets.length - 1; i++) {
            uint256 amount = (totalSupply * percentages[i]) / 100;
            _mint(wallets[i], amount);
            remainingTokens -= amount;
        }
        
        // Last wallet gets the remaining tokens to handle any rounding issues
        _mint(wallets[wallets.length - 1], remainingTokens);
    }
} 